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

# Include routers
app.include_router(mikrotik.router)
app.include_router(smartolt.router)
app.include_router(mpesa.router)
app.include_router(ai_assistant.router)
app.include_router(employees.router)
app.include_router(payroll.router)
app.include_router(tickets.router)
# SaaS Platform Routers
app.include_router(saas_auth.router)
app.include_router(subscriptions.router)
app.include_router(payhero.router)

@app.get("/health")
def read_root():
    return {"status": "ok", "service": "My Net Backend"}
