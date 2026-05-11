import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Warning: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in environment.")
    supabase: Client = None
else:
    supabase: Client = create_client(url, key)
