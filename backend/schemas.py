from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MilestoneBase(BaseModel):
    title: str
    date: Optional[str] = None
    status: str = "Pending"
    notes: Optional[str] = None


class MilestoneCreate(MilestoneBase):
    pass


class MilestoneOut(MilestoneBase):
    id: int
    program_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ActionBase(BaseModel):
    title: str
    owner: Optional[str] = None
    due_date: Optional[str] = None
    status: str = "Open"
    priority: str = "Medium"
    notes: Optional[str] = None


class ActionCreate(ActionBase):
    pass


class ActionOut(ActionBase):
    id: int
    program_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class RiskBase(BaseModel):
    title: str
    impact: str = "Medium"
    probability: str = "Medium"
    status: str = "Open"
    mitigation: Optional[str] = None


class RiskCreate(RiskBase):
    pass


class RiskOut(RiskBase):
    id: int
    program_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class DecisionBase(BaseModel):
    title: str
    date: Optional[str] = None
    owner: Optional[str] = None
    notes: Optional[str] = None


class DecisionCreate(DecisionBase):
    pass


class DecisionOut(DecisionBase):
    id: int
    program_id: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ProgramBase(BaseModel):
    name: str
    description: Optional[str] = None
    solution_area: Optional[str] = None
    market: Optional[str] = None
    status: str = "Green"
    program_stage: Optional[str] = None
    program_tier: Optional[str] = None
    program_type: Optional[str] = None
    launch_date: Optional[str] = None
    launch_date_display: Optional[str] = None
    executive_sponsor: Optional[str] = None
    product_manager: Optional[str] = None
    aha_link: Optional[str] = None
    path_to_green: Optional[str] = None
    latest_updates: Optional[str] = None
    local_notes: Optional[str] = None


class ProgramUpdate(BaseModel):
    local_notes: Optional[str] = None
    status: Optional[str] = None
    path_to_green: Optional[str] = None


class ProgramOut(ProgramBase):
    id: int
    sp_id: Optional[int] = None
    date_reported: Optional[str] = None
    requestor: Optional[str] = None
    risks_and_deps: Optional[str] = None
    tasks_text: Optional[str] = None
    issues_text: Optional[str] = None
    synced_at: Optional[datetime] = None
    created_at: datetime
    milestones: List[MilestoneOut] = []
    actions: List[ActionOut] = []
    risks: List[RiskOut] = []
    decisions: List[DecisionOut] = []

    model_config = {"from_attributes": True}


class ProgramSummary(BaseModel):
    id: int
    sp_id: Optional[int] = None
    name: str
    solution_area: Optional[str] = None
    status: str
    program_stage: Optional[str] = None
    program_tier: Optional[str] = None
    launch_date: Optional[str] = None
    launch_date_display: Optional[str] = None
    executive_sponsor: Optional[str] = None
    latest_updates: Optional[str] = None
    synced_at: Optional[datetime] = None
    action_count: int = 0
    open_action_count: int = 0
    risk_count: int = 0
    open_risk_count: int = 0
    milestone_count: int = 0

    model_config = {"from_attributes": True}


class MeetingExtractRequest(BaseModel):
    program_id: Optional[int] = None
    meeting_notes: str


class ExtractionResult(BaseModel):
    actions: List[ActionBase] = []
    risks: List[RiskBase] = []
    decisions: List[DecisionBase] = []
    milestones: List[MilestoneBase] = []
    summary: str = ""


class SaveExtractionRequest(BaseModel):
    program_id: int
    extraction: ExtractionResult
    raw_text: str


class ReportRequest(BaseModel):
    program_ids: Optional[List[int]] = None
    report_type: str = "weekly_digest"


class SyncStatus(BaseModel):
    synced: int
    created: int
    updated: int
    errors: List[str] = []
