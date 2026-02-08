from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import mikrotik, smartolt, mpesa

app = FastAPI(title="My Net ISP Backend")

# CORS configuration
origins = [
    "*", # Allow all origins for dev simplicity
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mikrotik.router)
app.include_router(smartolt.router)
app.include_router(mpesa.router)

@app.get("/health")
def read_root():
    return {"status": "ok", "service": "My Net Backend"}
