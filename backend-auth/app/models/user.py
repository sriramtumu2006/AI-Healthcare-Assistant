import enum
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, DateTime, CheckConstraint, Uuid
from app.database import Base

class UserRole(str, enum.Enum):
    PATIENT = "PATIENT"
    CAREGIVER = "CAREGIVER"
    DOCTOR = "DOCTOR"
    ADMIN = "ADMIN"

def utc_now() -> datetime:
    """Returns timezone-naive UTC datetime to store in SQLite."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=True)
    phone_number = Column(String, unique=True, nullable=True)
    password_hash = Column(String, nullable=False)
    role = Column(SQLEnum(UserRole), nullable=False, default=UserRole.PATIENT)
    is_verified = Column(Boolean, nullable=False, default=False)
    refresh_token_hash = Column(String, nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now, onupdate=utc_now)

    __table_args__ = (
        CheckConstraint(
            "(email IS NOT NULL AND email != '') OR (phone_number IS NOT NULL AND phone_number != '')",
            name="check_email_or_phone_present"
        ),
    )
