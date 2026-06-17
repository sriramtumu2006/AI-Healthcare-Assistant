import os
import datetime
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
import httpx

from app.database import engine, Base, get_db
from app import models
from app.routes import auth, profile, symptoms, doctors, appointments, records, dashboard
from app.routes.auth import get_current_user, require_role, log_action
from app.routes.doctors import seed_doctors
from app.routes.symptoms import scan_for_emergency

app = FastAPI(
    title="AI Healthcare Assistant",
    description="Backend API for managing user profiles, medical records, appointments, symptoms analysis, and AI chat capabilities.",
    version="1.0.0"
)

# --- CORS Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Startup Event to Initialize and Seed DB ---
@app.on_event("startup")
def startup_db_setup():
    # Automatically create tables if they do not exist
    Base.metadata.create_all(bind=engine)
    # Seed the doctors table
    db = next(get_db())
    try:
        seed_doctors(db)
    finally:
        db.close()

# --- Include Routers ---
app.include_router(auth.router)
app.include_router(profile.router)
app.include_router(symptoms.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(records.router)
app.include_router(dashboard.router)

# --- Pydantic Schemas for Conversations & AI & Notifications ---
class ConversationCreate(BaseModel):
    title: Optional[str] = None

class ConversationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

class ConversationDetailResponse(BaseModel):
    conversation: ConversationResponse
    messages: List[MessageResponse]

class AIChatInput(BaseModel):
    message: str

class AISymptomInput(BaseModel):
    symptoms: str
    duration: str
    severity: str

class AIResponse(BaseModel):
    reply: str
    emergency_detected: bool
    disclaimer: str

class NotificationSend(BaseModel):
    recipient_id: int
    message: str
    alert_type: str = "general" # emergency, general, reminder

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    details: Optional[str]
    timestamp: datetime.datetime

    class Config:
        from_attributes = True

# --- Conversations API ---

@app.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
def start_conversation(
    conv_data: ConversationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        title = conv_data.title or f"Chat on {datetime.date.today().strftime('%Y-%m-%d')}"
        new_conv = models.Conversation(
            user_id=current_user.id,
            title=title
        )
        db.add(new_conv)
        db.commit()
        db.refresh(new_conv)

        log_action(db, current_user.id, "START_CONVERSATION", f"Started conversation ID {new_conv.id}: '{title}'")
        return new_conv
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while starting conversation: {str(e)}"
        )

@app.get("/conversations", response_model=List[ConversationResponse])
def get_my_conversations(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conversations = db.query(models.Conversation).filter(
            models.Conversation.user_id == current_user.id
        ).order_by(models.Conversation.created_at.desc()).all()
        return conversations
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching conversations: {str(e)}"
        )

@app.get("/conversations/{id}", response_model=ConversationDetailResponse)
def get_one_conversation(
    id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conversation = db.query(models.Conversation).filter(models.Conversation.id == id).first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # RBAC Check: Users can view their own; Doctors/Admins/Caregivers can view any
        if current_user.role == "patient" and conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access to this conversation is forbidden"
            )

        messages = db.query(models.Message).filter(
            models.Message.conversation_id == id
        ).order_by(models.Message.timestamp.asc()).all()

        return {
            "conversation": conversation,
            "messages": messages
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while fetching conversation details: {str(e)}"
        )

@app.post("/conversations/{id}/messages", response_model=MessageResponse)
async def send_message(
    id: int,
    msg_data: MessageCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        conversation = db.query(models.Conversation).filter(models.Conversation.id == id).first()
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        if current_user.role == "patient" and conversation.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden"
            )

        # 1. Save user's message
        user_message = models.Message(
            conversation_id=id,
            role="user",
            content=msg_data.content
        )
        db.add(user_message)
        db.commit()

        # 2. Check for emergency keywords
        is_emergency = scan_for_emergency(msg_data.content)
        disclaimer = "This is AI-generated information. Please consult a real doctor."

        if is_emergency:
            # If emergency, return standard prompt warning and call 108 suggestion
            assistant_content = (
                "EMERGENCY WARNING: The symptoms you described may require immediate medical attention. "
                "Please contact emergency services (call 108) or go to the nearest emergency room immediately."
            )
            # Log emergency event
            log_action(
                db, 
                current_user.id, 
                "EMERGENCY_DETECTED_IN_CHAT", 
                f"Emergency keywords flagged in Conversation {id}: '{msg_data.content}'"
            )
        else:
            # Load Groq API configurations
            groq_key = os.getenv("GROQ_API_KEY", "")
            has_valid_key = groq_key and not groq_key.startswith("your_groq_api_key")

            if has_valid_key:
                try:
                    # Retrieve conversation history
                    history_msgs = db.query(models.Message).filter(
                        models.Message.conversation_id == id
                    ).order_by(models.Message.timestamp.asc()).all()

                    payload_msgs = [
                        {
                            "role": "system",
                            "content": "You are a helpful medical assistant. Give general health information only. Always recommend consulting a doctor. Never diagnose or prescribe medication."
                        }
                    ]
                    # Append last 10 messages for context
                    for h_msg in history_msgs[-10:]:
                        payload_msgs.append({"role": h_msg.role, "content": h_msg.content})

                    async with httpx.AsyncClient() as client:
                        response = await client.post(
                            "https://api.groq.com/openai/v1/chat/completions",
                            headers={
                                "Authorization": f"Bearer {groq_key}",
                                "Content-Type": "application/json"
                            },
                            json={
                                "model": "llama-3.1-8b-instant",
                                "messages": payload_msgs,
                                "temperature": 0.5
                            },
                            timeout=8.0
                        )

                        if response.status_code == 200:
                            res_json = response.json()
                            assistant_content = res_json["choices"][0]["message"]["content"].strip()
                        else:
                            raise Exception(f"Groq API returned status {response.status_code}")
                except Exception as e:
                    print(f"Groq Chat API Error: {e}")
                    assistant_content = "I am sorry, but I am unable to connect to the medical knowledge base right now. Please try again shortly."
            else:
                assistant_content = (
                    "Thank you for sharing. For general wellness: keep a balanced diet, stay physically active, and monitor your symptoms. "
                    "Since my AI interface is operating in offline mode, I cannot provide custom insights."
                )

            # Append the mandatory disclaimer
            assistant_content = f"{assistant_content}\n\n[Disclaimer: {disclaimer}]"

        # 3. Save assistant's message
        assistant_message = models.Message(
            conversation_id=id,
            role="assistant",
            content=assistant_content
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)

        return assistant_message
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending message: {str(e)}"
        )

# --- AI Assistant API (Ad-Hoc) ---

@app.post("/ai/chat", response_model=AIResponse)
async def ai_chat(
    input_data: AIChatInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        is_emergency = scan_for_emergency(input_data.message)
        disclaimer = "This is AI-generated information. Please consult a real doctor."

        if is_emergency:
            reply = (
                "EMERGENCY ALERT: It seems you may be experiencing a medical emergency. "
                "Do not wait. Please call emergency services (108) or visit the nearest hospital emergency department immediately."
            )
            log_action(
                db, 
                current_user.id, 
                "EMERGENCY_DETECTED_IN_CHAT", 
                f"Ad-hoc chat emergency keywords: '{input_data.message}'"
            )
            return {
                "reply": reply,
                "emergency_detected": True,
                "disclaimer": disclaimer
            }

        groq_key = os.getenv("GROQ_API_KEY", "")
        has_valid_key = groq_key and not groq_key.startswith("your_groq_api_key")

        if has_valid_key:
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a helpful medical assistant. Give general health information only. Always recommend consulting a doctor. Never diagnose or prescribe medication."
                                },
                                {
                                    "role": "user",
                                    "content": input_data.message
                                }
                            ],
                            "temperature": 0.5
                        },
                        timeout=8.0
                    )
                    if response.status_code == 200:
                        reply = response.json()["choices"][0]["message"]["content"].strip()
                    else:
                        raise Exception(f"Groq responded with status {response.status_code}")
            except Exception as e:
                print(f"Groq API error in ad-hoc chat: {e}")
                reply = "I cannot provide dynamic information right now. Please seek advice from a licensed medical professional."
        else:
            reply = "I am currently offline. Please consult a physician for any physical symptoms or health concerns."

        reply = f"{reply}\n\n[Disclaimer: {disclaimer}]"
        return {
            "reply": reply,
            "emergency_detected": False,
            "disclaimer": disclaimer
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during AI chat: {str(e)}"
        )

@app.post("/ai/symptom-check", response_model=AIResponse)
async def ai_symptom_check(
    input_data: AISymptomInput,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        combined_symptoms = f"{input_data.symptoms} (severity: {input_data.severity}, duration: {input_data.duration})"
        is_emergency = scan_for_emergency(combined_symptoms)
        disclaimer = "This is AI-generated information. Please consult a real doctor."

        if is_emergency:
            reply = (
                "EMERGENCY WARNING: Critical symptoms identified. Please contact medical emergency services (call 108) "
                "or head to the emergency room immediately."
            )
            log_action(
                db, 
                current_user.id, 
                "EMERGENCY_DETECTED_IN_SYMPTOM_CHECK", 
                f"Ad-hoc symptom check emergency: '{combined_symptoms}'"
            )
            return {
                "reply": reply,
                "emergency_detected": True,
                "disclaimer": disclaimer
            }

        groq_key = os.getenv("GROQ_API_KEY", "")
        has_valid_key = groq_key and not groq_key.startswith("your_groq_api_key")

        if has_valid_key:
            try:
                async with httpx.AsyncClient() as client:
                    user_prompt = (
                        f"Please analyze these symptoms:\n"
                        f"Symptoms: {input_data.symptoms}\n"
                        f"Duration: {input_data.duration}\n"
                        f"Severity: {input_data.severity}\n\n"
                        f"Provide a brief assessment, potential general causes (not a definitive diagnosis), "
                        f"and recommended action plan (e.g. self-care vs scheduling a doctor visit)."
                    )
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {groq_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": "llama-3.1-8b-instant",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": "You are a helpful medical assistant. Give general health information only. Always recommend consulting a doctor. Never diagnose or prescribe medication."
                                },
                                {
                                    "role": "user",
                                    "content": user_prompt
                                }
                            ],
                            "temperature": 0.4
                        },
                        timeout=8.0
                    )
                    if response.status_code == 200:
                        reply = response.json()["choices"][0]["message"]["content"].strip()
                    else:
                        raise Exception(f"Groq API returned status {response.status_code}")
            except Exception as e:
                print(f"Groq API error in symptom check: {e}")
                reply = "Unable to process symptoms at the moment. Please consult a physician."
        else:
            reply = (
                f"You reported: '{input_data.symptoms}' with a severity of '{input_data.severity}' lasting for '{input_data.duration}'. "
                "We recommend resting and booking an appointment with a general practitioner for an accurate physical evaluation."
            )

        reply = f"{reply}\n\n[Disclaimer: {disclaimer}]"
        return {
            "reply": reply,
            "emergency_detected": False,
            "disclaimer": disclaimer
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during symptom check: {str(e)}"
        )

# --- Notifications API ---

@app.post("/notifications/send")
def send_notification(
    notification: NotificationSend,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Check permissions: Caregivers, Doctors, and Admins can send to anyone. Patients can only send to themselves or caregivers.
        if current_user.role == "patient" and notification.recipient_id != current_user.id:
            # Query if recipient is a caregiver or if there is a caregiver-patient relationship
            # To keep it simple, block patients from sending to arbitrary IDs unless it's themselves.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to send notifications to this recipient."
            )

        # Log notification event
        log_action(
            db, 
            current_user.id, 
            "NOTIFICATION_SENT", 
            f"Notification of type '{notification.alert_type}' sent to User ID {notification.recipient_id}. Content: '{notification.message}'"
        )

        return {
            "status": "success",
            "message": f"Notification successfully sent to user ID {notification.recipient_id}",
            "details": {
                "alert_type": notification.alert_type,
                "sent_at": datetime.datetime.utcnow().isoformat()
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while sending notification: {str(e)}"
        )

# --- Audit Logs API (Admin Only) ---

@app.get("/audit/logs", response_model=List[AuditLogResponse])
def get_audit_logs(
    current_user: models.User = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    try:
        logs = db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).all()
        return logs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while retrieving audit logs: {str(e)}"
        )
