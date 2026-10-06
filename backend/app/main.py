import os

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["*"],
    allow_headers=["*"],
)


from dotenv import load_dotenv

# Load environment variables from backend/.env
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database.connection import Base, engine
from app.models import analysis as _a, dataset as _d  # noqa: F401
from app.api import (
    upload,
    dataset,
    analysis,
    visualization,
    cleaning,
    ai,
    reports,
)

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title="AI Data Analyst API",
    version="1.0.0",
)

# Allow React/Vite frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
for router_module in (
    upload,
    dataset,
    analysis,
    visualization,
    cleaning,
    ai,
    reports,
):
    app.include_router(
        router_module.router,
        prefix="/api/datasets",
    )


@app.get("/")
def root():
    return {
        "message": "AI Data Analyst API is running"
    }