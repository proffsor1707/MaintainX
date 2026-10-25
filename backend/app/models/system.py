import uuid
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.incident import Incident
    from app.models.metric import Metric
    from app.models.prediction import Prediction


class System(TimestampMixin, Base):
    __tablename__ = "systems"
    __table_args__ = (
        CheckConstraint("status IN ('healthy', 'watch', 'offline')", name="valid_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True, index=True)
    slug: Mapped[str] = mapped_column(String(180), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="healthy", server_default="healthy")

    metrics: Mapped[list["Metric"]] = relationship(back_populates="system", cascade="all, delete-orphan")
    incidents: Mapped[list["Incident"]] = relationship(back_populates="system", cascade="all, delete-orphan")
    predictions: Mapped[list["Prediction"]] = relationship(back_populates="system", cascade="all, delete-orphan")