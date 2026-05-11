from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import os
from openai import OpenAI
from typing import List, Optional

router = APIRouter(prefix="/api/ai", tags=["AI Assistant"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

# Initialize OpenAI client (requires OPENAI_API_KEY env var)
client = None
try:
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        client = OpenAI(api_key=api_key)
except Exception as e:
    print(f"Warning: OpenAI client could not be initialized: {e}")

SYSTEM_PROMPT = """
You are 'My Net AI', the official support assistant for My Net ISP Solutions. 
Your goal is to help users manage their ISP network, understand billing, and troubleshoot connectivity issues.
You are professional, friendly, and expert in MikroTik and SmartOLT systems.
Always be concise and helpful. If a user asks about payments, remind them that they can view their status at /payment-success.
"""

@router.post("/chat")
async def chat_with_assistant(request: ChatRequest):
    if not client:
        # Mock response for development if API key is missing
        return {
            "role": "assistant",
            "content": "Hello! I am My Net AI. (Note: OpenAI API Key is missing, this is a mock response). How can I help you today?"
        }

    try:
        # Prepare messages including system prompt
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        response = client.chat.completions.create(
            model="gpt-3.5-turbo", # Or gpt-4o as preferred
            messages=messages,
        )

        assistant_msg = response.choices[0].message
        return {
            "role": "assistant",
            "content": assistant_msg.content
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
