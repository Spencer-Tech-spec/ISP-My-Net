import os
import requests
from dotenv import load_dotenv
from supabase import create_client
from openai import OpenAI

# Load env vars
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
load_dotenv(dotenv_path=dotenv_path)

def test_supabase():
    print("\n--- Testing Supabase ---")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or "your-project-id" in url:
        print("[ERROR] Supabase URL is not configured.")
        return False
        
    try:
        supabase = create_client(url, key)
        # Try a simple range query to check connectivity
        supabase.table("mpesa_transactions").select("*").limit(1).execute()
        print("[SUCCESS] Supabase connection successful!")
        return True
    except Exception as e:
        print(f"[ERROR] Supabase connection failed: {e}")
        return False

def test_mpesa():
    print("\n--- Testing M-Pesa ---")
    key = os.getenv("MPESA_CONSUMER_KEY")
    secret = os.getenv("MPESA_CONSUMER_SECRET")
    
    if not key or not secret:
        print("[ERROR] M-Pesa credentials not configured.")
        return False
        
    auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    try:
        response = requests.get(auth_url, auth=(key, secret))
        if response.status_code == 200:
            print("[SUCCESS] M-Pesa Access Token generated successfully!")
            return True
        else:
            print(f"[ERROR] M-Pesa Auth failed: {response.text}")
            return False
    except Exception as e:
        print(f"[ERROR] M-Pesa connection failed: {e}")
        return False

def test_openai():
    print("\n--- Testing OpenAI (AI Assistant) ---")
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("[INFO] OpenAI API Key not found. AI Assistant will use mock responses.")
        return False
        
    try:
        client = OpenAI(api_key=api_key)
        # Simple models list check
        client.models.list()
        print("[SUCCESS] OpenAI connection successful!")
        return True
    except Exception as e:
        print(f"[ERROR] OpenAI connection failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting Credential Verification...")
    s_ok = test_supabase()
    m_ok = test_mpesa()
    o_ok = test_openai()
    
    print("\n" + "="*30)
    print("Verification Summary:")
    print(f"Supabase: {'PASS' if s_ok else 'FAIL'}")
    print(f"M-Pesa:   {'PASS' if m_ok else 'FAIL'}")
    print(f"OpenAI:   {'PASS' if o_ok else 'INFO (Not set)'}")
    print("="*30)
