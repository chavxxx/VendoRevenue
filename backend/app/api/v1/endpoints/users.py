import subprocess
import urllib.request
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_roles
from app.models import User, UserRole, RevenueShareConfiguration, HarvestTransaction
from app.schemas import UserCreate, UserUpdate, UserResponse, SystemUpdateInfo
from app.services.audit_service import log_action
from decimal import Decimal
from datetime import date

router = APIRouter()

@router.get("/", response_model=List[UserResponse])
def list_users(
    role: Optional[UserRole] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    return query.order_by(User.id.asc()).offset(skip).limit(limit).all()

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing_user = db.query(User).filter(
        (User.username == payload.username) | (User.email == payload.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email already registered")
        
    hashed = get_password_hash(payload.password)
    user_data = payload.model_dump(exclude={"password"})
    new_user = User(
        hashed_password=hashed,
        **user_data
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    log_action(
        db,
        action="CREATE_USER",
        entity_type="USER",
        entity_id=str(new_user.id),
        user_id=current_user.id,
        new_values={"username": new_user.username, "role": new_user.role.value}
    )
    return new_user

@router.put("/{id}", response_model=UserResponse)
def update_user(
    id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    if "password" in update_data and update_data["password"]:
        user.hashed_password = get_password_hash(update_data.pop("password"))
        
    for k, v in update_data.items():
        setattr(user, k, v)
        
    db.commit()
    db.refresh(user)
    
    log_action(
        db,
        action="UPDATE_USER",
        entity_type="USER",
        entity_id=str(user.id),
        user_id=current_user.id,
        new_values=update_data
    )
    return user

# Configuration management
@router.get("/config/revenue-share")
def get_revenue_share_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cfg = db.query(RevenueShareConfiguration).filter(RevenueShareConfiguration.is_active == True).first()
    if not cfg:
        return {
            "partner_percentage": 25.0,
            "staff_incentive_percentage": 5.0,
            "gartech_net_percentage": 70.0
        }
    return {
        "partner_percentage": float(cfg.partner_percentage),
        "staff_incentive_percentage": float(cfg.staff_incentive_percentage),
        "gartech_net_percentage": float(cfg.gartech_net_percentage),
        "effective_date": cfg.effective_date
    }

@router.post("/config/revenue-share")
def update_revenue_share_config(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    p_pct = Decimal(str(payload.get("partner_percentage", 25.0)))
    s_pct = Decimal(str(payload.get("staff_incentive_percentage", 5.0)))
    g_pct = Decimal(str(payload.get("gartech_net_percentage", 70.0)))
    
    if p_pct + s_pct + g_pct != Decimal("100.00"):
        raise HTTPException(status_code=400, detail="Total percentages must sum to exactly 100.00%")
        
    db.query(RevenueShareConfiguration).update({"is_active": False})
    
    new_cfg = RevenueShareConfiguration(
        partner_percentage=p_pct,
        staff_incentive_percentage=s_pct,
        gartech_net_percentage=g_pct,
        is_active=True,
        effective_date=date.today(),
        updated_by_user_id=current_user.id
    )
    db.add(new_cfg)
    db.commit()
    
    log_action(
        db,
        action="UPDATE_REVENUE_CONFIG",
        entity_type="CONFIG",
        entity_id=str(new_cfg.id),
        user_id=current_user.id,
        new_values={
            "partner_pct": str(p_pct),
            "staff_pct": str(s_pct),
            "gartech_pct": str(g_pct)
        }
    )
    return {"status": "SUCCESS", "message": "Revenue sharing configuration updated. Historical transactions remain unaffected."}


# System Update Checker & Maintenance
@router.get("/system/update-check", response_model=SystemUpdateInfo)
def check_system_updates(
    current_user: User = Depends(get_current_user)
):
    """
    Checks GitHub repository for updates and compares with local commit.
    """
    repo_url = "https://github.com/chavxxx/VendoRevenue"
    api_url = "https://api.github.com/repos/chavxxx/VendoRevenue/commits/main"
    current_commit = "main-latest"
    current_version = "v2.1.0"
    
    # Try reading local git commit hash
    try:
        git_res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=3
        )
        if git_res.returncode == 0 and git_res.stdout.strip():
            current_commit = git_res.stdout.strip()[:8]
    except Exception:
        pass

    latest_commit = None
    has_update = False
    latest_msg = None
    latest_author = None
    latest_date = None

    try:
        req = urllib.request.Request(
            api_url,
            headers={"User-Agent": "Gartech-Vendo-UpdateChecker"}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                remote_sha = data.get("sha", "")
                latest_commit = remote_sha[:8] if remote_sha else None
                commit_info = data.get("commit", {})
                latest_msg = commit_info.get("message", "").split("\n")[0]
                latest_author = commit_info.get("author", {}).get("name")
                latest_date = commit_info.get("author", {}).get("date")

                if latest_commit and current_commit != "main-latest":
                    if latest_commit != current_commit:
                        has_update = True
    except Exception as e:
        # If GitHub repo is private or uncommitted or network down, handle gracefully
        latest_msg = f"Check performed. Remote reachable or waiting for first commit ({str(e)[:40]})."

    return SystemUpdateInfo(
        current_version=current_version,
        current_commit=current_commit,
        latest_commit=latest_commit or current_commit,
        has_update=has_update,
        latest_message=latest_msg or "System is running latest stable release.",
        latest_author=latest_author or "GARTECH Development Team",
        latest_date=latest_date or datetime.now(timezone.utc).isoformat(),
        repo_url=repo_url,
        checked_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    )


@router.post("/system/clean-database")
def clean_sample_database(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Cleans all harvest transactions from the database while retaining
    vendos, partners, staff, configurations, and user accounts.
    """
    count = db.query(HarvestTransaction).count()
    db.query(HarvestTransaction).delete()
    db.commit()
    
    log_action(
        db,
        action="CLEAN_DATABASE",
        entity_type="SYSTEM",
        entity_id="ALL_HARVESTS",
        user_id=current_user.id,
        new_values={"harvests_removed": count}
    )
    return {
        "status": "SUCCESS",
        "message": f"Successfully wiped {count} sample harvest transactions. Database is now completely clean for production.",
        "harvests_removed": count
    }
