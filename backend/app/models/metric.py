import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin
from app.models.system import System


class Metric(TimestampMixin, Base):
    __tablename__ = "metrics"
    __table_args__ = (Index("ix_metrics_system_recorded_at", "system_id", "recorded_at"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("systems.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str | None] = mapped_column(String(40), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    system: Mapped[System] = relationship(back_populates="metrics")