from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Import routers
from app.routers import mikrotik, smartolt, mpesa, ai_assistant

app = FastAPI(title="My Net ISP Backend")

# CORS configuration
origins = [
    "*", # Allow all origins for dev simplicity - Lock this down in production!
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(mikrotik.router)
app.include_router(smartolt.router)
app.include_router(mpesa.router)
app.include_router(ai_assistant.router)

@app.get("/health")
def read_root():
    return {"status": "ok", "service": "My Net Backend"}
