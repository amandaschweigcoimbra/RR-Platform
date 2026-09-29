from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime
from typing import Optional, List


class Program(Base):
    __tablename__ = "programs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sp_id: Mapped[Optional[int]] = mapped_column(Integer, unique=True, nullable=True)
    name: Mapped[str] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    solution_area: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    market: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Green")
    program_stage: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    program_tier: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    program_type: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    launch_date: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    launch_date_display: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    date_reported: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    executive_sponsor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    product_manager: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    requestor: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    aha_link: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    path_to_green: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    latest_updates: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    risks_and_deps: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    tasks_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    issues_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    local_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now())

    milestones: Mapped[List["Milestone"]] = relationship(back_populates="program", cascade="all, delete-orphan")
    actions: Mapped[List["Action"]] = relationship(back_populates="program", cascade="all, delete-orphan")
    risks: Mapped[List["Risk"]] = relationship(back_populates="program", cascade="all, delete-orphan")
    decisions: Mapped[List["Decision"]] = relationship(back_populates="program", cascade="all, delete-orphan")
    meeting_notes: Mapped[List["MeetingNote"]] = relationship(back_populates="program", cascade="all, delete-orphan")


class Milestone(Base):
    __tablename__ = "milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"))
    title: Mapped[str] = mapped_column(String(500))
    date: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Pending")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    program: Mapped["Program"] = relationship(back_populates="milestones")


class Action(Base):
    __tablename__ = "actions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"))
    title: Mapped[str] = mapped_column(String(500))
    owner: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    due_date: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="Open")
    priority: Mapped[str] = mapped_column(String(50), default="Medium")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    program: Mapped["Program"] = relationship(back_populates="actions")


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"))
    title: Mapped[str] = mapped_column(String(500))
    impact: Mapped[str] = mapped_column(String(50), default="Medium")
    probability: Mapped[str] = mapped_column(String(50), default="Medium")
    status: Mapped[str] = mapped_column(String(50), default="Open")
    mitigation: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    program: Mapped["Program"] = relationship(back_populates="risks")


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[int] = mapped_column(ForeignKey("programs.id"))
    title: Mapped[str] = mapped_column(String(500))
    date: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    owner: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    program: Mapped["Program"] = relationship(back_populates="decisions")


class MeetingNote(Base):
    __tablename__ = "meeting_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    program_id: Mapped[Optional[int]] = mapped_column(ForeignKey("programs.id"), nullable=True)
    raw_text: Mapped[str] = mapped_column(Text)
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    program: Mapped[Optional["Program"]] = relationship(back_populates="meeting_notes")
