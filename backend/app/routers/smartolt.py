from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(
    prefix="/smartolt",
    tags=["smartolt"],
)

class SmartOLTConfig(BaseModel):
    url: str
    api_key: str

@router.post("/test-connection")
async def test_connection(config: SmartOLTConfig):
    # TODO: Implement actual SmartOLT API call
    if config.url and config.api_key:
        return {"status": "success", "message": "Connected to SmartOLT"}
    else:
        raise HTTPException(status_code=400, detail="Missing URL or API Key")

@router.get("/info")
async def get_info():
    return {"module": "SmartOLT", "version": "1.0"}
