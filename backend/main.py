from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import get_connection, initialize_database
from routers import properties, reservations, stats


@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_database()
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Vacation Rental Channel Manager API",
        description="Manage vacation rental properties, reservations and availability.",
        version="0.2.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/", tags=["meta"])
    def home():
        return {
            "message": "Welcome to the Vacation Rental Channel Manager API",
            "status": "running",
            "docs": "/docs",
        }

    @app.get("/health", tags=["meta"])
    def health_check():
        with get_connection() as connection:
            connection.execute("SELECT 1")
        return {
            "status": "healthy",
            "service": "vacation-rental-backend",
            "database": "ok",
        }

    app.include_router(properties.router)
    app.include_router(reservations.router)
    app.include_router(stats.router)
    return app


app = create_app()
