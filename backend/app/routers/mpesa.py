from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import requests
import base64
from datetime import datetime
import os

router = APIRouter(
    prefix="/mpesa",
    tags=["mpesa"],
    responses={404: {"description": "Not found"}},
)

# Placeholder Credentials - REPLACE THESE WITH YOUR ACTUAL DARAJA CREDENTIALS
# You can get these from https://developer.safaricom.co.ke/
CONSUMER_KEY = os.getenv("MPESA_CONSUMER_KEY", "YOUR_CONSUMER_KEY")
CONSUMER_SECRET = os.getenv("MPESA_CONSUMER_SECRET", "YOUR_CONSUMER_SECRET")
# The Shortcode/Paybill Number receiving the funds
BUSINESS_SHORTCODE = os.getenv("MPESA_SHORTCODE", "174379") 
PASSKEY = os.getenv("MPESA_PASSKEY", "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919")
# Callback URL - Use a live URL (e.g. ngrok) for testing callbacks
CALLBACK_URL = os.getenv("MPESA_CALLBACK_URL", "https://mydomain.com/mpesa/callback")

class PaymentRequest(BaseModel):
    phone_number: str
    amount: int
    account_reference: str = "MyNetISP"
    transaction_desc: str = "Payment for Internet Service"

def get_access_token():
    auth_url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    try:
        response = requests.get(auth_url, auth=(CONSUMER_KEY, CONSUMER_SECRET))
        response.raise_for_status()
        return response.json()['access_token']
    except Exception as e:
        print(f"Error getting access token: {e}")
        raise HTTPException(status_code=500, detail="Failed to get M-Pesa Access Token")

@router.post("/stk_push")
def initiate_stk_push(payment: PaymentRequest):
    access_token = get_access_token()
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    password_str = f"{BUSINESS_SHORTCODE}{PASSKEY}{timestamp}"
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
        "BusinessShortCode": BUSINESS_SHORTCODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": payment.amount,
        "PartyA": phone, # Customer Phone Number
        "PartyB": BUSINESS_SHORTCODE, # Receiving Paybill Number
        "PhoneNumber": phone,
        "CallBackURL": CALLBACK_URL,
        "AccountReference": payment.account_reference,
        "TransactionDesc": payment.transaction_desc
    }
    
    try:
        response = requests.post(stk_url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        print(f"M-Pesa API Error: {e.response.text}")
        raise HTTPException(status_code=400, detail=f"M-Pesa Error: {e.response.json().get('errorMessage', 'Unknown Error')}")
    except Exception as e:
        print(f"Server Error: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error during Payment Processing")
