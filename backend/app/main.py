"""FreightIQ — FastAPI Application Main Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config.settings import settings
from app.models.database import SessionLocal
from app.seed.seed_data import seed_database
from app.routers import reference, recommendations, contracts
from app.schemas.schemas import HealthResponse


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Seed database if needed
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown: Clean up resources if necessary


app = FastAPI(
    title="FreightIQ API",
    description="Intelligent Freight Forecasting and Vessel Chartering Decision Platform MVP",
    version="1.0.0",
    lifespan=lifespan
)

# Robust CORS configuration for React development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(reference.router)
app.include_router(recommendations.router)
app.include_router(contracts.router)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Health check endpoint."""
    return HealthResponse(status="ok", service="FreightIQ API")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
