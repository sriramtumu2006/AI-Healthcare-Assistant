import logging
import uuid
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from jose import JWTError

from app.models.user import User
from app.auth.schemas import RegisterRequest, LoginRequest
from app.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    create_verification_token,
    decode_token,
    hash_token
)

# Setup audit logger for tracking logins
logger = logging.getLogger("auth_audit")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.StreamHandler()
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler.setFormatter(formatter)
    logger.addHandler(handler)

def register_user(db: Session, data: RegisterRequest) -> tuple[User, str]:
    """
    Registers a new user after verifying that the email and phone number are unique.
    Sets is_verified=False and returns the created user and verification token.
    """
    if data.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email address already registered"
            )
    if data.phone_number:
        existing = db.query(User).filter(User.phone_number == data.phone_number).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already registered"
            )

    hashed = hash_password(data.password)
    user = User(
        email=data.email,
        phone_number=data.phone_number,
        password_hash=hashed,
        role=data.role,
        is_verified=False
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate verification token
    verification_token = create_verification_token(user.id)
    return user, verification_token

def verify_user(db: Session, token: str) -> User:
    """
    Validates the verification token and updates the user's is_verified flag to True.
    """
    try:
        payload = decode_token(token)
        purpose = payload.get("purpose")
        user_id = payload.get("sub")
        if purpose != "verification" or not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification token"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expired or invalid verification token"
        )

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not found"
        )

    if user.is_verified:
        return user

    user.is_verified = True
    db.commit()
    db.refresh(user)
    return user

def login_user(db: Session, data: LoginRequest) -> dict:
    """
    Authenticates a user, verifies that they are verified, generates access and refresh tokens,
    stores the hashed refresh token in the DB, and logs the login event.
    """
    user = None
    if data.email:
        user = db.query(User).filter(User.email == data.email).first()
    elif data.phone_number:
        user = db.query(User).filter(User.phone_number == data.phone_number).first()

    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/phone number or password"
        )

    if not user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not verified. Please verify your account first."
        )

    access_token = create_access_token(user.id, user.role.value)
    refresh_token = create_refresh_token(user.id, user.role.value)

    # Save hashed refresh token to database
    user.refresh_token_hash = hash_token(refresh_token)
    db.commit()
    db.refresh(user)

    # Login audit logging
    logger.info(f"Audit Log: User {user.id} (Role: {user.role.value}) logged in successfully.")

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": user
    }

def refresh_tokens(db: Session, refresh_token: str) -> dict:
    """
    Validates the refresh token, checks it against the stored hash in the DB,
    and returns a rotated access/refresh token pair.
    """
    try:
        payload = decode_token(refresh_token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token payload"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token"
        )

    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user or not user.refresh_token_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Compare SHA-256 hash of incoming token with stored hash
    incoming_hash = hash_token(refresh_token)
    if user.refresh_token_hash != incoming_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    # Rotate tokens
    new_access = create_access_token(user.id, user.role.value)
    new_refresh = create_refresh_token(user.id, user.role.value)

    user.refresh_token_hash = hash_token(new_refresh)
    db.commit()
    db.refresh(user)

    return {
        "access_token": new_access,
        "refresh_token": new_refresh,
        "token_type": "bearer",
        "user": user
    }

def logout_user(db: Session, user: User) -> None:
    """
    Invalidates the user's current session by clearing the stored refresh token.
    """
    user.refresh_token_hash = None
    db.commit()
