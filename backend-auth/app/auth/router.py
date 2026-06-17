from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.schemas import (
    RegisterRequest,
    RegisterResponse,
    LoginRequest,
    LoginResponse,
    RefreshRequest,
    VerifyRequest
)
from app.auth import service
from app.dependencies.roles import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registers a new user (patient, caregiver, doctor, or admin).
    Returns HTTP 201 Created along with user details and a verification token.
    """
    user, verification_token = service.register_user(db, data)
    return {
        "message": "User registered successfully. Please verify your account.",
        "user": user,
        "verification_token": verification_token
    }

@router.post("/verify", status_code=status.HTTP_200_OK)
def verify(data: VerifyRequest, db: Session = Depends(get_db)):
    """
    Verifies a user's account using the verification token.
    Required before logging in.
    """
    service.verify_user(db, data.verification_token)
    return {"message": "Account verified successfully"}

@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user, logs the event, and returns access & refresh tokens.
    Only allows login for verified accounts.
    """
    return service.login_user(db, data)

@router.post("/refresh", response_model=LoginResponse, status_code=status.HTTP_200_OK)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    """
    Rotates the session tokens using a valid refresh token.
    Invalidates the old refresh token and issues a new pair.
    """
    return service.refresh_tokens(db, data.refresh_token)

@router.post("/logout", status_code=status.HTTP_200_OK)
def logout(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Logs out the authenticated user by invalidating the refresh token stored in the database.
    """
    service.logout_user(db, current_user)
    return {"message": "Logged out successfully"}
