"""Anthropic AI client — supports both SAP local proxy and real Anthropic API key."""
import os
import httpx
from typing import Any

# Cloud / production: set ANTHROPIC_API_KEY to a real Anthropic key.
# Local dev via SAP proxy: set ANTHROPIC_BASE_URL + ANTHROPIC_AUTH_TOKEN=placeholder.
_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
_BASE_URL = os.getenv("ANTHROPIC_BASE_URL", "https://api.anthropic.com")
_AUTH_TOKEN = os.getenv("ANTHROPIC_AUTH_TOKEN", "")
DEFAULT_MODEL = os.getenv("AI_DEFAULT_MODEL", "claude-sonnet-4-5")
FAST_MODEL = os.getenv("AI_FAST_MODEL", "claude-haiku-4-5-20251001")


async def chat(prompt: str, system: str = "", model: str | None = None, max_tokens: int = 4096) -> str:
    m = model or DEFAULT_MODEL
    headers = {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
    }
    # Real Anthropic API key takes priority; fall back to SAP proxy token
    key = _API_KEY or (_AUTH_TOKEN if _AUTH_TOKEN not in ("", "placeholder") else "")
    if key:
        headers["x-api-key"] = key

    body: dict[str, Any] = {
        "model": m,
        "max_tokens": max_tokens,
        "messages": [{"role": "user", "content": prompt}],
    }
    if system:
        body["system"] = system

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(f"{_BASE_URL}/v1/messages", headers=headers, json=body)
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]
