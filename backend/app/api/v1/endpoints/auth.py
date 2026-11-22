from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import verify_password, create_access_token
from app.core.dependencies import get_current_user
from app.models import User
from app.schemas import LoginRequest, Token, UserResponse
from app.services.audit_service import log_action

router = APIRouter()

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == request.username).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )
    
    extra_claims = {
        "full_name": user.full_name,
        "email": user.email,
        "staff_id": user.staff_id
    }
    access_token = create_access_token(
        subject=user.username,
        role=user.role.value,
        extra_claims=extra_claims
    )
    
    log_action(
        db,
        action="LOGIN",
        entity_type="USER",
        entity_id=str(user.id),
        user_id=user.id,
        new_values={"username": user.username, "role": user.role.value}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user
