import uuid
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, model_validator, field_validator
from app.models.user import UserRole

class UserResponse(BaseModel):
    id: uuid.UUID
    role: UserRole
    email: Optional[str] = None
    phone_number: Optional[str] = None

    class Config:
        from_attributes = True

class RegisterRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    role: UserRole = UserRole.PATIENT

    @model_validator(mode="after")
    def check_identifier(self) -> 'RegisterRequest':
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone_number must be provided")
        return self

    @field_validator("password")
    @classmethod
    def validate_password_complexity(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        special_chars = "!@#$%^&*()-_=+[]{}|;:',.<>?/~`"
        if not any(c in special_chars for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

class RegisterResponse(BaseModel):
    message: str
    user: UserResponse
    verification_token: str

class LoginRequest(BaseModel):
    email: Optional[EmailStr] = None
    phone_number: Optional[str] = None
    password: str

    @model_validator(mode="after")
    def check_identifier(self) -> 'LoginRequest':
        if not self.email and not self.phone_number:
            raise ValueError("Either email or phone_number must be provided")
        return self

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

class RefreshRequest(BaseModel):
    refresh_token: str

class VerifyRequest(BaseModel):
    verification_token: str
