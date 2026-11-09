FROM python:3.12-slim AS base

WORKDIR /app

RUN python -m venv /opt/venv

ENV PATH="/opt/venv/bin:$PATH" \ 
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt .

RUN pip install -r requirements.txt

COPY . .

RUN mkdir /data

ENV DATA_PATH=/data

RUN useradd -r -u 8888 -M -s /sbin/nologin appuser \
    && chown -R appuser:appuser /data 

USER appuser

EXPOSE 8000

FROM base AS development

WORKDIR /app

CMD ["uvicorn", "main:app", "--reload", "--host", "0.0.0.0"]

FROM base AS production

CMD ["uvicorn", "main:app", "--host", "0.0.0.0"]
