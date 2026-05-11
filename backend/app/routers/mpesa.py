from fastapi import APIRouter, HTTPException, Request, BackgroundTasks
from pydantic import BaseModel
import requests
import base64
from datetime import datetime
import os
from app.database import supabase
from app.utils import activate_client

router = APIRouter(
    prefix="/mpesa",
    tags=["mpesa"],
    responses={404: {"description": "Not found"}},
)

# Helper to get M-Pesa credentials from DB or Env
def get_mpesa_credentials():
    # Default from Env
    creds = {
        "CONSUMER_KEY": os.getenv("MPESA_CONSUMER_KEY"),
        "CONSUMER_SECRET": os.getenv("MPESA_CONSUMER_SECRET"),
        "BUSINESS_SHORTCODE": os.getenv("MPESA_SHORTCODE", "174379"),
        "PASSKEY": os.getenv("MPESA_PASSKEY"),
        "CALLBACK_URL": os.getenv("MPESA_CALLBACK_URL"),
        "INITIATOR_NAME": os.getenv("MPESA_INITIATOR_NAME"),
        "INITIATOR_PASSWORD": os.getenv("MPESA_INITIATOR_PASSWORD")
    }

    # Try to fetch from Supabase 'settings' table
    if supabase:
        try:
            response = supabase.table("settings").select("*").eq("id", 1).single().execute()
            if response.data:
                db_settings = response.data
                # Override with DB values if they exist
                if db_settings.get("mpesa_consumer_key"): creds["CONSUMER_KEY"] = db_settings["mpesa_consumer_key"]
                if db_settings.get("mpesa_consumer_secret"): creds["CONSUMER_SECRET"] = db_settings["mpesa_consumer_secret"]
                if db_settings.get("mpesa_shortcode"): creds["BUSINESS_SHORTCODE"] = db_settings["mpesa_shortcode"]
                if db_settings.get("mpesa_passkey"): creds["PASSKEY"] = db_settings["mpesa_passkey"]
                if db_settings.get("mpesa_callback_url"): creds["CALLBACK_URL"] = db_settings["mpesa_callback_url"]
                if db_settings.get("mpesa_initiator_name"): creds["INITIATOR_NAME"] = db_settings["mpesa_initiator_name"]
                if db_settings.get("mpesa_initiator_password"): creds["INITIATOR_PASSWORD"] = db_settings["mpesa_initiator_password"]
        except Exception as e:
            print(f"Note: Could not fetch settings from DB (table might not exist yet): {e}")
    
    return creds

class PaymentRequest(BaseModel):
    phone_number: str
    amount: int
    account_reference: str = "MyNetISP"
    transaction_desc: str = "Payment for Internet Service"

def get_access_token():
    creds = get_mpesa_credentials()
    key = creds["CONSUMER_KEY"]
    secret = creds["CONSUMER_SECRET"]

    if not key or not secret:
        raise HTTPException(status_code=500, detail="M-Pesa credentials not configured")

    auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    print(f"DEBUG: Fetching access token from {auth_url}...")
    try:
        response = requests.get(auth_url, auth=(key, secret), timeout=10)
        response.raise_for_status()
        token = response.json()['access_token']
        print("DEBUG: Access token fetched successfully")
        return token
    except Exception as e:
        print(f"Error getting access token: {e}")
        raise HTTPException(status_code=500, detail="Failed to get M-Pesa Access Token")

@router.post("/stk_push")
def initiate_stk_push(payment: PaymentRequest, background_tasks: BackgroundTasks):
    creds = get_mpesa_credentials()
    passkey = creds["PASSKEY"]
    callback_url = creds["CALLBACK_URL"]
    shortcode = creds["BUSINESS_SHORTCODE"]

    if not passkey or not callback_url:
         raise HTTPException(status_code=500, detail="M-Pesa Passkey or Callback URL not configured")

    access_token = get_access_token()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password_str = f"{shortcode}{passkey}{timestamp}"
    password = base64.b64encode(password_str.encode()).decode('utf-8')
    
    stk_url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # Format phone number to 254... (remove +)
    phone = payment.phone_number.replace("+", "")
    if phone.startswith("0"):
        phone = "254" + phone[1:]

    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": payment.amount,
        "PartyA": phone, # Customer Phone Number
        "PartyB": shortcode, # Receiving Paybill Number
        "PhoneNumber": phone,
        "CallBackURL": callback_url,
        "AccountReference": payment.account_reference,
        "TransactionDesc": payment.transaction_desc
    }
    
    print(f"DEBUG: Sending STK Push request to {stk_url}...")
    print(f"DEBUG: Payload: {payload}")
    try:
        response = requests.post(stk_url, json=payload, headers=headers, timeout=10)
        print(f"DEBUG: M-Pesa Response Status: {response.status_code}")
        response.raise_for_status()
        data = response.json()
        print(f"DEBUG: STK Push Response Data: {data}")
        
        # Save transaction to Database
        if supabase:
            try:
                # We save the checkout request ID to match with callback later
                checkout_request_id = data.get("CheckoutRequestID")
                merchant_request_id = data.get("MerchantRequestID")
                
                supabase.table("mpesa_transactions").insert({
                    "phone_number": phone,
                    "amount": payment.amount,
                    "checkout_request_id": checkout_request_id,
                    "merchant_request_id": merchant_request_id,
                    "status": "PENDING",
                    "result_desc": "STK Push Initiated"
                }).execute()
                print(f"Transaction recorded: {checkout_request_id}")
            except Exception as e:
                print(f"Database Error: {e}")
                # Don't fail the request if DB fails, but log it and maybe alert admin

        return data
    except requests.exceptions.HTTPError as e:
        print(f"M-Pesa API Error: {e.response.text}")
        raise HTTPException(status_code=400, detail=f"M-Pesa Error: {e.response.json().get('errorMessage', 'Unknown Error')}")
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during Payment Processing")

@router.post("/callback")
async def mpesa_callback(request: Request, background_tasks: BackgroundTasks):
    data = await request.json()
    print(f"M-Pesa Callback Data: {data}")
    
    try:
        stk_callback = data.get("Body", {}).get("stkCallback", {})
        result_code = stk_callback.get("ResultCode")
        result_desc = stk_callback.get("ResultDesc")
        checkout_request_id = stk_callback.get("CheckoutRequestID")
        
        status = "FAILED"
        receipt_number = None

        if result_code == 0:
            status = "COMPLETED"
            callback_metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])
            for item in callback_metadata:
                if item.get("Name") == "MpesaReceiptNumber":
                    receipt_number = item.get("Value")
                # We can also capture amount, date, etc. if needed
        
        # Update Database
        if supabase:
            update_data = {
                "status": status,
                "result_desc": result_desc,
                "updated_at": datetime.now().isoformat()
            }
            if receipt_number:
                update_data["mpesa_receipt_number"] = receipt_number
                
            # Execute update
            response = supabase.table("mpesa_transactions").update(update_data).eq("checkout_request_id", checkout_request_id).execute()
            
            # Use data from the updated record (or the callback) to finding the user
            # Ideally we kept the phone number in the transaction record
            # We need to fetch the transaction primarily to get the phone number if we trust DB
            # Or we can just use the phone number from metadata if available (it often is in Metadata under PhoneNumber)
            
            if status == "COMPLETED" and response.data:
                transaction = response.data[0]
                phone_number = transaction.get("phone_number")
                
                if phone_number:
                     print(f"Payment successful for {phone_number}. Activating service...")
                     background_tasks.add_task(activate_client, phone_number)
                else:
                    print("Could not find phone number in transaction record.")

    except Exception as e:
        print(f"Error processing callback: {e}")
        # M-Pesa expects a 200 OK even if we fail to process
    
    return {"status": "received"}
