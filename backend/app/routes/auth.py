import os
import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import bcrypt
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app import models

# Load configurations
SECRET_KEY = os.getenv("SECRET_KEY", "healthcare_secret_key_123")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = int(os.getenv("ACCESS_TOKEN_EXPIRE_HOURS", "24"))

# Password hashing
# Hashing done directly via bcrypt package

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# --- Pydantic Schemas ---
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    role: str = "patient" # patient, doctor, admin, caregiver

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenRefresh(BaseModel):
    refresh_token: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    created_at: datetime.datetime

    class Config:
        from_attributes = True

# --- Helpers ---
def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)

def create_access_token(data: dict, expires_delta: Optional[datetime.timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.datetime.utcnow() + expires_delta
    else:
        expire = datetime.datetime.utcnow() + datetime.timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(days=7) # Refresh token lasts 7 days
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def log_action(db: Session, user_id: Optional[int], action: str, details: str):
    try:
        db_log = models.AuditLog(user_id=user_id, action=action, details=details)
        db.add(db_log)
        db.commit()
    except Exception as e:
        db.rollback()
        # Fallback print if DB log fails
        print(f"Failed to write audit log: {e}")

# --- Security Dependencies ---
def get_current_user(token: Optional[str] = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        token_type: str = payload.get("type")
        if email is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.email == email).first()
    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Inactive user")
    return user

def require_role(allowed_roles: list[str]):
    def role_dependency(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {allowed_roles}"
            )
        return current_user
    return role_dependency

# --- Endpoints ---

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_data: UserRegister, db: Session = Depends(get_db)):
    try:
        # Check if user already exists
        existing_user = db.query(models.User).filter(models.User.email == user_data.email).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email is already registered"
            )

        # Validate role
        valid_roles = ["patient", "doctor", "admin", "caregiver"]
        if user_data.role not in valid_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid role. Must be one of {valid_roles}"
            )

        # Create new user
        hashed_password = get_password_hash(user_data.password)
        new_user = models.User(
            email=user_data.email,
            password=hashed_password,
            role=user_data.role,
            is_active=True
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Audit logging
        log_action(db, new_user.id, "REGISTER", f"User registered with role: {new_user.role}")

        return new_user
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during registration: {str(e)}"
        )

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(models.User.email == login_data.email).first()
        if not user or not verify_password(login_data.password, user.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User account is deactivated"
            )

        # Generate tokens
        access_token = create_access_token(data={"sub": user.email, "role": user.role})
        refresh_token = create_refresh_token(data={"sub": user.email})

        # Audit logging
        log_action(db, user.id, "LOGIN", f"User logged in successfully")

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "role": user.role
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during login: {str(e)}"
        )

@router.post("/refresh", response_model=Token)
def refresh(refresh_data: TokenRefresh, db: Session = Depends(get_db)):
    try:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate refresh token",
        )
        try:
            payload = jwt.decode(refresh_data.refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")
            token_type: str = payload.get("type")
            if email is None or token_type != "refresh":
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = db.query(models.User).filter(models.User.email == email).first()
        if not user or not user.is_active:
            raise credentials_exception

        # Generate new tokens
        access_token = create_access_token(data={"sub": user.email, "role": user.role})
        new_refresh_token = create_refresh_token(data={"sub": user.email})

        # Audit logging
        log_action(db, user.id, "TOKEN_REFRESH", f"User refreshed access token")

        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "token_type": "bearer",
            "role": user.role
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during token refresh: {str(e)}"
        )

@router.post("/logout")
def logout(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Audit logging
        log_action(db, current_user.id, "LOGOUT", "User logged out")
        return {"status": "success", "message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during logout: {str(e)}"
        )
