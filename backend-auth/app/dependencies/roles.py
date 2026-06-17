from typing import List
import uuid
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.auth.security import decode_token

# Define standard Bearer token scheme
security = HTTPBearer()

def get_current_user_claims(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to validate the JWT access token and return its decoded claims.
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        role = payload.get("role")
        if not user_id or not role:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims: sub or role missing"
            )
        return {"user_id": user_id, "role": role}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token"
        )

def get_current_user(
    claims: dict = Depends(get_current_user_claims),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to fetch the full database User object of the currently logged-in user.
    """
    user_id = claims.get("user_id")
    user = db.query(User).filter(User.id == uuid.UUID(user_id)).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, claims: dict = Depends(get_current_user_claims)) -> dict:
        user_role = claims.get("role")
        if user_role not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permission denied: insufficient role privileges"
            )
        return claims

def require_role(allowed_roles: List[str]):
    """
    Reusable RBAC dependency. 
    Usage: require_role(["ADMIN", "DOCTOR"])
    """
    return Depends(RoleChecker(allowed_roles))
