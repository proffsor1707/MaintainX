import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.system import System


class Incident(TimestampMixin, Base):
    __tablename__ = "incidents"
    __table_args__ = (
        CheckConstraint("severity IN ('critical', 'high', 'medium', 'low')", name="valid_severity"),
        CheckConstraint("status IN ('open', 'investigating', 'resolved')", name="valid_status"),
        Index("ix_incidents_system_status", "system_id", "status"),
        Index("ix_incidents_severity_created_at", "severity", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("systems.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(240), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(24), nullable=False, default="open", server_default="open")
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    system: Mapped["System"] = relationship(back_populates="incidents")