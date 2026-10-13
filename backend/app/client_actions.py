from app.database import supabase

def activate_client(phone_number: str):
    """
    Activates a client's internet service based on their phone number.
    
    1. Looks up the user profile by phone number (assuming phone number is in profiles).
    2. Updates their status to 'active'.
    3. (Future) Triggers MikroTik/Radius activation.
    """
    print(f"Attempting to activate internet for client with phone: {phone_number}")
    
    if not supabase:
        print("Database connection not available. Cannot activate client.")
        return False
        
    try:
        # Example: Find user by phone number in 'profiles' table
        # Adjust 'phone' column name as per actual schema
        response = supabase.table("profiles").select("*").eq("phone", phone_number).execute()
        
        if response.data:
            user = response.data[0]
            user_id = user.get("id")
            
            # Update status to Active
            supabase.table("profiles").update({"status": "Active"}).eq("id", user_id).execute()
            print(f"Client {user_id} activated successfully.")
            return True
        else:
            print(f"No user found with phone number {phone_number}")
            return False
            
    except Exception as e:
        print(f"Error activating client: {e}")
        return False
