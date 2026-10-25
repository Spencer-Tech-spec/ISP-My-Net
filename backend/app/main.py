from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv(override=True)

# Import routers
from app.routers import mikrotik, smartolt, mpesa, ai_assistant, employees, payroll, tickets
from app.routers import saas_auth, subscriptions, payhero

app = FastAPI(title="My Net ISP Backend")

# CORS configuration
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"^https?://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (support both root prefixes and /api prefixes)
routers_to_mount = [
    mikrotik.router,
    smartolt.router,
    mpesa.router,
    ai_assistant.router,
    employees.router,
    payroll.router,
    tickets.router,
    saas_auth.router,
    subscriptions.router,
    payhero.router,
]

for r in routers_to_mount:
    app.include_router(r)
    app.include_router(r, prefix="/api")

@app.get("/health")
def read_root():
    return {"status": "ok", "service": "My Net Backend"}
