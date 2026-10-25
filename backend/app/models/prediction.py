import uuid
from datetime import datetime
from typing import Any, TYPE_CHECKING

from sqlalchemy import CheckConstraint, DateTime, Float, ForeignKey, Index, JSON, String, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.system import System


class Prediction(TimestampMixin, Base):
    __tablename__ = "predictions"
    __table_args__ = (
        CheckConstraint("score >= 0 AND score <= 1", name="score_in_range"),
        CheckConstraint("severity IN ('critical', 'high', 'medium', 'low')", name="valid_severity"),
        Index("ix_predictions_system_created_at", "system_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    system_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("systems.id", ondelete="CASCADE"), nullable=False
    )
    prediction_type: Mapped[str] = mapped_column(String(100), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    severity: Mapped[str] = mapped_column(String(20), nullable=False)
    details: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    system: Mapped["System"] = relationship(back_populates="predictions")