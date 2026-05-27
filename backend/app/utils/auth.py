from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.database import supabase
import os

security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    """
    Verifies the JWT token from Supabase and returns the user data.
    """
    token = credentials.credentials
    try:
        # Verify the token with Supabase
        user_response = supabase.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        
        return user_response.user
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Authentication failed: {str(e)}")

async def get_admin_user(user = Depends(get_current_user)):
    """
    Ensures the authenticated user has the 'admin' role.
    """
    # Fetch profile to check role
    profile = supabase.table("profiles").select("role").eq("id", user.id).single().execute()
    
    if not profile.data or profile.data.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required")
    
    return user
