from typing import Optional, Any, Dict
from app.database import supabase

async def log_action(
    actor_id: str,
    action_type: str,
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = None
):
    """
    Log a system action to the database for auditing purposes.
    """
    try:
        log_entry = {
            "actor_id": actor_id,
            "action_type": action_type,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "details": details,
            "ip_address": ip_address
        }
        supabase.table("system_logs").insert(log_entry).execute()
    except Exception as e:
        print(f"FAILED TO LOG ACTION: {str(e)}")
        # We don't raise here to prevent the main action from failing due to a logging error
