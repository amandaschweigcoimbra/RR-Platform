"""Microsoft Graph API client — reads token from ~/.sap-mcp/auth.json"""
import json
import os
import re
import time
from pathlib import Path
from typing import Optional
import httpx


def _get_graph_token() -> Optional[str]:
    # Cloud deployment: set GRAPH_TOKEN env var directly (re-set when it expires)
    if env_token := os.getenv("GRAPH_TOKEN"):
        return env_token
    # Local dev: read from ~/.sap-mcp/auth.json (populated by Claude Code SAP MCP tools)
    auth_file = os.getenv("SAP_MCP_AUTH_FILE", str(Path.home() / ".sap-mcp" / "auth.json"))
    try:
        with open(auth_file) as f:
            data = json.load(f)
        for provider in data.get("providers", {}).values():
            for token_entry in provider.get("tokens", []):
                if "graph.microsoft.com" in token_entry.get("audience", ""):
                    if token_entry.get("expiresAt", 0) > time.time():
                        return token_entry["token"]
        return None
    except Exception:
        return None


GRAPH_BASE = "https://graph.microsoft.com/v1.0"


async def _graph_get(path: str) -> dict:
    token = _get_graph_token()
    if not token:
        raise RuntimeError("No valid Microsoft Graph token found. Open Claude Code and use any SAP Outlook tool to refresh it.")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(
            f"{GRAPH_BASE}{path}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_sharepoint_site_id(site_path: str) -> str:
    data = await _graph_get(f"/sites/{site_path}")
    return data["id"]


async def get_list_id(site_id: str, list_name: str) -> str:
    data = await _graph_get(f"/sites/{site_id}/lists")
    for lst in data.get("value", []):
        if lst.get("displayName", "").lower() == list_name.lower():
            return lst["id"]
    raise ValueError(f"List '{list_name}' not found on site")


async def get_amanda_programs(lead_name: str = "Coimbra, Amanda") -> list[dict]:
    """Fetch list items where Program Lead display name matches lead_name."""
    site_path = os.getenv("SHAREPOINT_SITE", "sap.sharepoint.com:/sites/208727")
    list_name = os.getenv("SHAREPOINT_LIST_NAME", "Release Readiness Intake and Program Tracker (Public)")

    site_id = await get_sharepoint_site_id(site_path)
    list_id = await get_list_id(site_id, list_name)

    # Explicitly selecting Assignedto0 (in addition to LookupId) causes Graph to return
    # the person's display name as a string — without this select it only returns the numeric ID.
    fields_select = (
        "id,Assignedto0,Assignedto0LookupId,LinkTitle,LinkTitleNoMenu,Title,"
        "Description,ProductArea,Market_x002f_Theatre_x002f_DataC,Status,Status0,Tier,ProgramType,"
        "TargetDateforCompletion,TargetLaunchDate_x0028_StatusRep,DateReported,ExecuitveSponsor,"
        "Issueloggedby,Aha_x0020_Link,PathtoGreen,LatestUpdatesHighlights,RisksandIssues,"
        "Tasks_x002f_ActionItem,Issues"
    )
    url = (
        f"/sites/{site_id}/lists/{list_id}/items"
        f"?$expand=fields($select={fields_select})&$top=200"
    )

    items = []
    while url:
        url_path = url if url.startswith("/") else url.replace(GRAPH_BASE, "")
        data = await _graph_get(url_path)
        for item in data.get("value", []):
            fields = item.get("fields", {})
            lead_val = (fields.get("Assignedto0") or "").lower()
            if lead_name.lower() in lead_val:
                items.append(fields)
        next_link = data.get("@odata.nextLink")
        url = next_link.replace(GRAPH_BASE, "") if next_link else None

    return items


def map_item_to_program(fields: dict) -> dict:
    """Map raw SharePoint fields (discovered internal names) to our Program schema."""
    def f(*keys):
        for k in keys:
            v = fields.get(k)
            if v is not None and v != "":
                if isinstance(v, list):
                    # Handle lookup arrays like [{'LookupValue': 'Spend'}]
                    parts = [item.get("LookupValue", str(item)) if isinstance(item, dict) else str(item) for item in v]
                    return ", ".join(parts)
                return str(v) if not isinstance(v, str) else v
        return None

    # Status0 = traffic-light status (Red/Yellow/Green)
    # Status  = Program Stage (e.g. "Program Execution", "Completed")
    raw_status = f("Status0", "status") or "Green"
    status = _normalise_status(raw_status)

    return {
        "sp_id": fields.get("id") or fields.get("ID"),
        "name": f("LinkTitle", "LinkTitleNoMenu", "Title") or "Unnamed",
        "description": f("Description"),
        "solution_area": f("ProductArea"),
        "market": f("Market_x002f_Theatre_x002f_DataC"),
        "status": status,
        "program_stage": f("Status"),          # Program Stage column
        "program_tier": f("Tier"),
        "program_type": f("ProgramType"),
        "launch_date": f("TargetDateforCompletion"),
        "launch_date_display": f("TargetLaunchDate_x0028_StatusRep"),
        "date_reported": f("DateReported"),
        "executive_sponsor": f("ExecuitveSponsor"),
        "product_manager": _lookup_value(fields.get("Issueloggedby")),  # Requestor
        "requestor": _lookup_value(fields.get("Issueloggedby")),
        "aha_link": f("Aha_x0020_Link"),
        "path_to_green": f("PathtoGreen"),
        "latest_updates": _strip_html(f("LatestUpdatesHighlights")),
        "risks_and_deps": _strip_html(f("RisksandIssues")),
        "tasks_text": _strip_html(f("Tasks_x002f_ActionItem")),
        "issues_text": _strip_html(f("Issues")),
    }


def _lookup_value(val) -> Optional[str]:
    """Extract display name from a SharePoint lookup array."""
    if not val:
        return None
    if isinstance(val, list) and val:
        first = val[0]
        if isinstance(first, dict):
            return first.get("LookupValue") or first.get("Email")
    return str(val) if val else None


def _strip_html(text: Optional[str]) -> Optional[str]:
    """Strip HTML to readable plain text, preserving list structure as bullet points."""
    if not text:
        return None
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</p>|</div>|</h\d>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>", "• ", text, flags=re.IGNORECASE)
    text = re.sub(r"</li>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<[^>]+>", "", text)
    text = text.replace("&#58;", ":").replace("&#160;", " ").replace("&amp;", "&")
    text = text.replace("&lt;", "<").replace("&gt;", ">").replace("&nbsp;", " ")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip() or None


def _normalise_status(raw: str) -> str:
    low = raw.lower().strip()
    if "red" in low:
        return "Red"
    if "yellow" in low or "amber" in low:
        return "Yellow"
    if "green" in low:
        return "Green"
    if "complet" in low:
        return "Completed"
    if "hold" in low:
        return "On Hold"
    if "cancel" in low:
        return "Cancelled"
    return raw.title()
