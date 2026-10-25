FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
		PYTHONUNBUFFERED=1 \
		APP_ENV=production \
		PYTHONPATH=/workspace/backend \
		MODEL_ARTIFACT_PATH=/workspace/ml/models/inference_pipeline.joblib

WORKDIR /workspace
COPY backend/requirements/base.txt /workspace/backend/requirements/base.txt
RUN pip install --no-cache-dir -r /workspace/backend/requirements/base.txt \
		&& groupadd --system app \
		&& useradd --system --gid app --home-dir /workspace app

COPY --chown=app:app backend/app /workspace/backend/app
COPY --chown=app:app backend/alembic /workspace/backend/alembic
COPY --chown=app:app backend/alembic.ini /workspace/backend/alembic.ini
COPY --chown=app:app ml/src /workspace/ml/src

WORKDIR /workspace/backend
USER app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
	CMD python -c "import os; from urllib.request import urlopen; urlopen('http://127.0.0.1:8000' + os.getenv('API_V1_PREFIX', '/api/v1') + '/health', timeout=3)" || exit 1

CMD ["sh", "-c", "python -m alembic upgrade head && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"]