import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.prediction import Prediction


class PredictionRepository:
    def __init__(self, session: Session) -> None:
        self.session = session

    def list_for_system(self, system_id: uuid.UUID, *, limit: int = 100) -> list[Prediction]:
        statement = (
            select(Prediction)
            .where(Prediction.system_id == system_id)
            .order_by(Prediction.created_at.desc())
            .limit(limit)
        )
        return list(self.session.scalars(statement))

    def latest_for_system(self, system_id: uuid.UUID) -> Prediction | None:
        statement = (
            select(Prediction)
            .where(Prediction.system_id == system_id)
            .order_by(Prediction.generated_at.desc(), Prediction.created_at.desc())
            .limit(1)
        )
        return self.session.scalar(statement)

    def add(self, prediction: Prediction) -> Prediction:
        self.session.add(prediction)
        self.session.flush()
        return prediction