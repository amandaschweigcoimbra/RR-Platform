from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from models import Program, Action, Risk, Milestone
from schemas import ReportRequest
from services import ai
from datetime import date

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post("/generate")
async def generate_report(body: ReportRequest, db: AsyncSession = Depends(get_db)):
    # Fetch programs
    q = select(Program)
    if body.program_ids:
        q = q.where(Program.id.in_(body.program_ids))
    result = await db.execute(q.order_by(Program.status, Program.name))
    programs = result.scalars().all()

    if not programs:
        raise HTTPException(400, "No programs found")

    if body.report_type == "weekly_digest":
        return await _weekly_digest(programs, db)
    elif body.report_type == "status_report":
        return await _status_report(programs[0], db)
    else:
        raise HTTPException(400, f"Unknown report_type: {body.report_type}")


async def _weekly_digest(programs: list, db: AsyncSession) -> dict:
    today = date.today().isoformat()

    # Build context for AI
    lines = [f"Today: {today}", "Portfolio Summary for Amanda Coimbra:\n"]
    for p in programs:
        actions = await db.execute(
            select(Action).where(Action.program_id == p.id, Action.status == "Open")
        )
        open_actions = actions.scalars().all()
        risks = await db.execute(
            select(Risk).where(Risk.program_id == p.id, Risk.status == "Open")
        )
        open_risks = risks.scalars().all()

        lines.append(f"## {p.name}")
        lines.append(f"Status: {p.status} | Stage: {p.program_stage} | Launch: {p.launch_date_display or p.launch_date}")
        if p.latest_updates:
            lines.append(f"Latest Update: {p.latest_updates[:300]}")
        if open_actions:
            lines.append(f"Open Actions ({len(open_actions)}): " + "; ".join(a.title for a in open_actions[:3]))
        if open_risks:
            lines.append(f"Open Risks ({len(open_risks)}): " + "; ".join(r.title for r in open_risks[:2]))
        lines.append("")

    context = "\n".join(lines)

    prompt = f"""Write a professional weekly portfolio digest for release readiness leadership based on this program data.

{context}

Format the digest as:
1. Executive Summary (3-4 sentences on overall portfolio health)
2. Programs Requiring Attention (RED/YELLOW programs with specific concerns)
3. On Track (brief GREEN program bullets)
4. Key Actions This Week (top 5 cross-portfolio actions)
5. Upcoming Milestones (next 2 weeks)

Be specific and data-driven. Use programme names. Tone: confident, clear, concise."""

    try:
        text = await ai.chat(prompt, max_tokens=2000)
        return {"report_type": "weekly_digest", "content": text, "generated_at": today}
    except Exception as e:
        raise HTTPException(500, str(e))


async def _status_report(program: Program, db: AsyncSession) -> dict:
    actions = await db.execute(
        select(Action).where(Action.program_id == program.id).order_by(Action.due_date)
    )
    all_actions = actions.scalars().all()
    milestones = await db.execute(
        select(Milestone).where(Milestone.program_id == program.id).order_by(Milestone.date)
    )
    all_milestones = milestones.scalars().all()
    risks = await db.execute(
        select(Risk).where(Risk.program_id == program.id)
    )
    all_risks = risks.scalars().all()

    context_parts = [
        f"Program: {program.name}",
        f"Status: {program.status}",
        f"Stage: {program.program_stage}",
        f"Tier: {program.program_tier}",
        f"Target Launch: {program.launch_date_display or program.launch_date}",
        f"Executive Sponsor: {program.executive_sponsor}",
        f"Product Manager: {program.product_manager}",
        "",
        f"Description: {program.description or 'N/A'}",
        "",
        f"Latest Updates: {program.latest_updates or 'N/A'}",
    ]
    if all_milestones:
        context_parts.append("\nMilestones:")
        for m in all_milestones:
            context_parts.append(f"  - [{m.status}] {m.title} ({m.date})")
    if all_actions:
        context_parts.append("\nOpen Actions:")
        for a in [x for x in all_actions if x.status == "Open"]:
            context_parts.append(f"  - {a.title} | Owner: {a.owner} | Due: {a.due_date} | Priority: {a.priority}")
    if all_risks:
        context_parts.append("\nOpen Risks:")
        for r in [x for x in all_risks if x.status == "Open"]:
            context_parts.append(f"  - {r.title} | Impact: {r.impact} | Prob: {r.probability}")

    context = "\n".join(context_parts)

    prompt = f"""Write a concise bi-weekly status report for this program, suitable for leadership review.

{context}

Structure:
- **Status**: [GREEN/YELLOW/RED] — one-line reason
- **Summary**: 2-3 sentence narrative
- **Milestones**: table or bullet list
- **Actions**: key open items with owners
- **Risks**: key risks with mitigations
- **Next Steps**: what happens in the next 2 weeks

Keep it under 400 words. Tone: professional, direct."""

    try:
        text = await ai.chat(prompt, max_tokens=1500)
        return {"report_type": "status_report", "program_id": program.id, "program_name": program.name, "content": text}
    except Exception as e:
        raise HTTPException(500, str(e))
