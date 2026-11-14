FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    
    CORS_ORIGINS=http://localhost:5173

RUN useradd --create-home --uid 1000 appuser

WORKDIR /app
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade -r requirements.txt
COPY --chown=appuser:appuser . .
USER appuser
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
CMD python -c "import urllib.request; urllib.request.urlopen ('http://localhost:8000/health')"|| exit 1
CMD [ "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" ]