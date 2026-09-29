from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Program, Action, Risk, Decision, Milestone, MeetingNote
from schemas import MeetingExtractRequest, ExtractionResult, SaveExtractionRequest
from services import ai
import json
import re

router = APIRouter(prefix="/meetings", tags=["meetings"])

EXTRACT_SYSTEM = """You are an expert program manager assistant. Extract structured information from meeting notes for release readiness tracking.
Return ONLY valid JSON with this exact structure:
{
  "actions": [{"title": "...", "owner": "...", "due_date": "...", "priority": "High|Medium|Low", "status": "Open"}],
  "risks": [{"title": "...", "impact": "High|Medium|Low", "probability": "High|Medium|Low", "status": "Open", "mitigation": "..."}],
  "decisions": [{"title": "...", "date": "today", "owner": "...", "notes": "..."}],
  "milestones": [{"title": "...", "date": "...", "status": "Pending|In Progress|Completed", "notes": "..."}],
  "summary": "2-3 sentence summary of the meeting"
}
Rules:
- Only extract items explicitly mentioned
- For dates, use ISO format (YYYY-MM-DD) when possible, or descriptive text
- For owner, use the person's name as mentioned in the notes
- Keep titles concise but specific
- If a field is not mentioned, use null or omit it
"""


@router.post("/extract", response_model=ExtractionResult)
async def extract_meeting(body: MeetingExtractRequest):
    if len(body.meeting_notes.strip()) < 20:
        raise HTTPException(status_code=400, detail="Meeting notes too short")

    prompt = f"""Extract actions, risks, decisions, and milestones from these meeting notes:

{body.meeting_notes}

Return only the JSON object as specified."""

    try:
        raw = await ai.chat(prompt, system=EXTRACT_SYSTEM, max_tokens=2048)
        # Strip markdown code fences if present
        clean = re.sub(r"```(?:json)?|```", "", raw).strip()
        data = json.loads(clean)
        return ExtractionResult(**data)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="AI returned invalid JSON. Try again.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save")
async def save_extraction(body: SaveExtractionRequest, db: AsyncSession = Depends(get_db)):
    # Verify program exists
    result = await db.execute(select(Program).where(Program.id == body.program_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(404, "Program not found")

    ext = body.extraction
    saved_counts = {"actions": 0, "risks": 0, "decisions": 0, "milestones": 0}

    for item in ext.actions:
        db.add(Action(**item.model_dump(), program_id=body.program_id))
        saved_counts["actions"] += 1

    for item in ext.risks:
        db.add(Risk(**item.model_dump(), program_id=body.program_id))
        saved_counts["risks"] += 1

    for item in ext.decisions:
        db.add(Decision(**item.model_dump(), program_id=body.program_id))
        saved_counts["decisions"] += 1

    for item in ext.milestones:
        db.add(Milestone(**item.model_dump(), program_id=body.program_id))
        saved_counts["milestones"] += 1

    # Store raw meeting note
    note = MeetingNote(
        program_id=body.program_id,
        raw_text=body.raw_text,
        ai_summary=ext.summary,
    )
    db.add(note)

    await db.commit()
    return {"saved": saved_counts}
