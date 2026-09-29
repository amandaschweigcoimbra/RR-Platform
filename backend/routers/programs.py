from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from database import get_db
from models import Program, Milestone, Action, Risk, Decision
from schemas import (
    ProgramOut, ProgramSummary, ProgramUpdate,
    MilestoneCreate, MilestoneOut,
    ActionCreate, ActionOut,
    RiskCreate, RiskOut,
    DecisionCreate, DecisionOut,
    SyncStatus,
)
from services.graph import get_amanda_programs, map_item_to_program
from datetime import datetime, timezone
import os

router = APIRouter(prefix="/programs", tags=["programs"])

LEAD_FILTER = os.getenv("PROGRAM_LEAD_FILTER", "Coimbra, Amanda")


@router.get("", response_model=list[ProgramSummary])
async def list_programs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Program,
            func.count(Action.id).label("action_count"),
            func.sum((Action.status == "Open").cast(int)).label("open_action_count"),
            func.count(Risk.id).label("risk_count"),
            func.sum((Risk.status == "Open").cast(int)).label("open_risk_count"),
            func.count(Milestone.id).label("milestone_count"),
        )
        .outerjoin(Action, Action.program_id == Program.id)
        .outerjoin(Risk, Risk.program_id == Program.id)
        .outerjoin(Milestone, Milestone.program_id == Program.id)
        .group_by(Program.id)
        .order_by(Program.name)
    )
    rows = result.all()
    summaries = []
    for row in rows:
        prog = row[0]
        d = ProgramSummary.model_validate(prog)
        d.action_count = row[1] or 0
        d.open_action_count = int(row[2] or 0)
        d.risk_count = row[3] or 0
        d.open_risk_count = int(row[4] or 0)
        d.milestone_count = row[5] or 0
        summaries.append(d)
    return summaries


@router.get("/{program_id}", response_model=ProgramOut)
async def get_program(program_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Program).where(Program.id == program_id)
    )
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    return prog


@router.patch("/{program_id}", response_model=ProgramOut)
async def update_program(program_id: int, body: ProgramUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Program).where(Program.id == program_id))
    prog = result.scalar_one_or_none()
    if not prog:
        raise HTTPException(status_code=404, detail="Program not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(prog, k, v)
    await db.commit()
    await db.refresh(prog)
    return prog


@router.post("/sync", response_model=SyncStatus)
async def sync_from_sharepoint(db: AsyncSession = Depends(get_db)):
    errors = []
    created = updated = 0
    try:
        sp_items = await get_amanda_programs(LEAD_FILTER)
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

    for item in sp_items:
        data = map_item_to_program(item)
        sp_id = data.get("sp_id")
        if sp_id is None:
            continue
        try:
            sp_id = int(sp_id)
        except (ValueError, TypeError):
            continue

        result = await db.execute(select(Program).where(Program.sp_id == sp_id))
        prog = result.scalar_one_or_none()
        if prog:
            for k, v in data.items():
                if k != "sp_id" and v is not None:
                    setattr(prog, k, v)
            prog.synced_at = datetime.now(timezone.utc)
            updated += 1
        else:
            prog = Program(**{k: v for k, v in data.items() if v is not None})
            prog.sp_id = sp_id
            prog.synced_at = datetime.now(timezone.utc)
            db.add(prog)
            created += 1

    await db.commit()
    return SyncStatus(synced=len(sp_items), created=created, updated=updated, errors=errors)


# ── Milestones ──────────────────────────────────────────────────────────────

@router.get("/{program_id}/milestones", response_model=list[MilestoneOut])
async def list_milestones(program_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Milestone).where(Milestone.program_id == program_id).order_by(Milestone.date)
    )
    return result.scalars().all()


@router.post("/{program_id}/milestones", response_model=MilestoneOut)
async def add_milestone(program_id: int, body: MilestoneCreate, db: AsyncSession = Depends(get_db)):
    m = Milestone(**body.model_dump(), program_id=program_id)
    db.add(m)
    await db.commit()
    await db.refresh(m)
    return m


@router.delete("/{program_id}/milestones/{milestone_id}", status_code=204)
async def delete_milestone(program_id: int, milestone_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Milestone).where(Milestone.id == milestone_id, Milestone.program_id == program_id)
    )
    m = result.scalar_one_or_none()
    if m:
        await db.delete(m)
        await db.commit()


# ── Actions ──────────────────────────────────────────────────────────────────

@router.get("/{program_id}/actions", response_model=list[ActionOut])
async def list_actions(program_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Action).where(Action.program_id == program_id).order_by(Action.due_date)
    )
    return result.scalars().all()


@router.post("/{program_id}/actions", response_model=ActionOut)
async def add_action(program_id: int, body: ActionCreate, db: AsyncSession = Depends(get_db)):
    a = Action(**body.model_dump(), program_id=program_id)
    db.add(a)
    await db.commit()
    await db.refresh(a)
    return a


@router.patch("/{program_id}/actions/{action_id}", response_model=ActionOut)
async def update_action(program_id: int, action_id: int, body: ActionCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Action).where(Action.id == action_id, Action.program_id == program_id)
    )
    a = result.scalar_one_or_none()
    if not a:
        raise HTTPException(404, "Not found")
    for k, v in body.model_dump(exclude_none=True).items():
        setattr(a, k, v)
    await db.commit()
    await db.refresh(a)
    return a


@router.delete("/{program_id}/actions/{action_id}", status_code=204)
async def delete_action(program_id: int, action_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Action).where(Action.id == action_id, Action.program_id == program_id)
    )
    a = result.scalar_one_or_none()
    if a:
        await db.delete(a)
        await db.commit()


# ── Risks ─────────────────────────────────────────────────────────────────────

@router.get("/{program_id}/risks", response_model=list[RiskOut])
async def list_risks(program_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Risk).where(Risk.program_id == program_id)
    )
    return result.scalars().all()


@router.post("/{program_id}/risks", response_model=RiskOut)
async def add_risk(program_id: int, body: RiskCreate, db: AsyncSession = Depends(get_db)):
    r = Risk(**body.model_dump(), program_id=program_id)
    db.add(r)
    await db.commit()
    await db.refresh(r)
    return r


@router.delete("/{program_id}/risks/{risk_id}", status_code=204)
async def delete_risk(program_id: int, risk_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Risk).where(Risk.id == risk_id, Risk.program_id == program_id)
    )
    r = result.scalar_one_or_none()
    if r:
        await db.delete(r)
        await db.commit()


# ── Decisions ─────────────────────────────────────────────────────────────────

@router.get("/{program_id}/decisions", response_model=list[DecisionOut])
async def list_decisions(program_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Decision).where(Decision.program_id == program_id).order_by(Decision.date.desc())
    )
    return result.scalars().all()


@router.post("/{program_id}/decisions", response_model=DecisionOut)
async def add_decision(program_id: int, body: DecisionCreate, db: AsyncSession = Depends(get_db)):
    d = Decision(**body.model_dump(), program_id=program_id)
    db.add(d)
    await db.commit()
    await db.refresh(d)
    return d


@router.delete("/{program_id}/decisions/{decision_id}", status_code=204)
async def delete_decision(program_id: int, decision_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Decision).where(Decision.id == decision_id, Decision.program_id == program_id)
    )
    d = result.scalar_one_or_none()
    if d:
        await db.delete(d)
        await db.commit()
