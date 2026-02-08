from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(
    prefix="/mikrotik",
    tags=["mikrotik"],
)

class MikroTikConnection(BaseModel):
    host: str
    username: str
    password: str
    port: int = 8728

@router.post("/test-connection")
async def test_connection(conn: MikroTikConnection):
    # TODO: Implement actual RouterOS API connection here
    # For now, we simulate a successful connection for valid inputs
    if conn.host and conn.username:
        return {"status": "success", "message": f"Connected to MikroTik at {conn.host}"}
    else:
        raise HTTPException(status_code=400, detail="Invalid connection parameters")

@router.get("/status")
async def get_status():
    return {"module": "MikroTik", "status": "active"}
