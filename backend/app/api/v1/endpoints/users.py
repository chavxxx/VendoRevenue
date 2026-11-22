import os
import shutil
import uuid
import subprocess
import urllib.request
import json
import zoneinfo
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.core.dependencies import get_current_user, require_roles
from app.core.config import settings
from app.models import (
    User, UserRole, RevenueShareConfiguration, HarvestTransaction, 
    VendoMachine, Partner, Staff, SystemSetting
)
from app.schemas import (
    UserCreate, UserUpdate, UserResponse, SystemUpdateInfo,
    SystemSettingUpdate, SystemSettingResponse
)
from app.services.audit_service import log_action
from decimal import Decimal
from datetime import date

router = APIRouter()

PST_TZ = zoneinfo.ZoneInfo("Asia/Manila")

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

@router.delete("/{id}")
def delete_user(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Deletes a user account. Admins cannot delete their own active account.
    """
    if id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own active administrator account.")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    username = user.username
    db.delete(user)
    db.commit()

    log_action(
        db,
        action="DELETE_USER",
        entity_type="USER",
        entity_id=str(id),
        user_id=current_user.id,
        new_values={"username": username}
    )

    return {"status": "SUCCESS", "message": f"User account {username} deleted successfully."}

# --- SYSTEM CUSTOMIZATION & SETTINGS ---
def get_or_create_system_settings(db: Session) -> SystemSetting:
    setting = db.query(SystemSetting).first()
    if not setting:
        setting = SystemSetting(
            company_name="GARTECH VENDO NETWORK",
            company_tagline="Vendo Machine Revenue Management & Monitoring",
            contact_phone="0917-000-0001",
            contact_email="support@gartech.ph",
            company_address="Valencia City, Bukidnon, Philippines",
            default_city="Valencia",
            default_province="Bukidnon",
            currency_symbol="₱",
            logo_url="/logo.jpg",
            partner_share_percentage=Decimal("25.00"),
            staff_incentive_percentage=Decimal("5.00"),
            gartech_net_percentage=Decimal("70.00")
        )
        db.add(setting)
        db.commit()
        db.refresh(setting)
    return setting

@router.get("/system/settings", response_model=SystemSettingResponse)
def get_system_settings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns app branding, company details, default locations, and revenue configuration.
    """
    return get_or_create_system_settings(db)

@router.put("/system/settings", response_model=SystemSettingResponse)
def update_system_settings(
    payload: SystemSettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Updates company customization, default location, logo, and revenue split (Partner, Staff Pool, GARTECH Net).
    """
    setting = get_or_create_system_settings(db)
    update_data = payload.model_dump(exclude_unset=True)
    
    # Auto-balance 3-way revenue split if percentages are modified
    p_pct = Decimal(str(update_data.get("partner_share_percentage", setting.partner_share_percentage)))
    s_pct = Decimal(str(update_data.get("staff_incentive_percentage", setting.staff_incentive_percentage)))
    
    if "partner_share_percentage" in update_data or "staff_incentive_percentage" in update_data:
        g_pct = Decimal("100.00") - p_pct - s_pct
        if g_pct < Decimal("0.00"):
            raise HTTPException(status_code=400, detail="Partner % + Staff Incentive Pool % cannot exceed 100%.")
        update_data["gartech_net_percentage"] = g_pct
        update_data["partner_share_percentage"] = p_pct
        update_data["staff_incentive_percentage"] = s_pct

        # Also synchronize active RevenueShareConfiguration
        db.query(RevenueShareConfiguration).update({"is_active": False})
        new_rev = RevenueShareConfiguration(
            partner_percentage=p_pct,
            staff_incentive_percentage=s_pct,
            gartech_net_percentage=g_pct,
            is_active=True,
            effective_date=date.today(),
            updated_by_user_id=current_user.id
        )
        db.add(new_rev)
        
    old_values = {k: str(getattr(setting, k)) for k in update_data.keys()}
    for k, v in update_data.items():
        setattr(setting, k, v)
        
    db.commit()
    db.refresh(setting)
    
    log_action(
        db,
        action="UPDATE_SYSTEM_SETTINGS",
        entity_type="SYSTEM",
        entity_id=str(setting.id),
        user_id=current_user.id,
        old_values=old_values,
        new_values={k: str(v) for k, v in update_data.items()}
    )
    return setting

@router.post("/system/settings/logo")
async def upload_system_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Uploads a new company logo image, saves to public/uploads, and updates settings.
    """
    allowed_exts = {".jpg", ".jpeg", ".png", ".webp", ".svg"}
    ext = os.path.splitext(file.filename)[1].lower() if file.filename else ".jpg"
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Invalid file type. Supported formats: JPG, PNG, WEBP, SVG.")
        
    upload_dir = settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    filename = f"logo_{uuid.uuid4().hex[:8]}{ext}"
    dest_path = os.path.join(upload_dir, filename)
    
    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Also write/copy to frontend public folder if local development exists
    public_logo_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "frontend", "public", "logo.jpg")
    try:
        if os.path.exists(os.path.dirname(public_logo_path)):
            shutil.copyfile(dest_path, public_logo_path)
    except Exception:
        pass
        
    setting = get_or_create_system_settings(db)
    logo_url = f"/uploads/{filename}"
    setting.logo_url = logo_url
    db.commit()
    db.refresh(setting)
    
    log_action(
        db,
        action="UPLOAD_LOGO",
        entity_type="SYSTEM",
        entity_id=str(setting.id),
        user_id=current_user.id,
        new_values={"logo_url": logo_url}
    )
    return {
        "status": "SUCCESS",
        "message": "Logo uploaded successfully",
        "logo_url": logo_url,
        "settings": setting
    }

# Revenue Share Configuration
@router.get("/config/revenue-share")
def get_revenue_share_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    setting = get_or_create_system_settings(db)
    return {
        "partner_percentage": float(setting.partner_share_percentage),
        "staff_incentive_percentage": float(setting.staff_incentive_percentage),
        "gartech_net_percentage": float(setting.gartech_net_percentage)
    }

@router.post("/config/revenue-share")
def update_revenue_share_config(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    p_pct = Decimal(str(payload.get("partner_percentage", 25.0)))
    s_pct = Decimal(str(payload.get("staff_incentive_percentage", 5.0)))
    g_pct = Decimal("100.00") - p_pct - s_pct
    
    if g_pct < Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Partner % + Staff Incentive Pool % cannot exceed 100%.")

    setting = get_or_create_system_settings(db)
    setting.partner_share_percentage = p_pct
    setting.staff_incentive_percentage = s_pct
    setting.gartech_net_percentage = g_pct
    
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
    return {
        "status": "SUCCESS", 
        "message": f"Revenue sharing updated to Location Partner {p_pct}% / Staff Incentive Pool {s_pct}% / GARTECH Net {g_pct}%."
    }

# System Update Checker
@router.get("/system/update-check", response_model=SystemUpdateInfo)
def check_system_updates(
    current_user: User = Depends(get_current_user)
):
    repo_url = "https://github.com/chavxxx/VendoRevenue"
    api_url = "https://api.github.com/repos/chavxxx/VendoRevenue/commits/main"
    current_commit = "main-latest"
    current_version = "v2.2.0"
    
    # Check git locally or inside container if git exists
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
        # If running inside docker container where .git is mounted or version file exists
        pass

    latest_commit = None
    has_update = False
    latest_msg = None
    latest_author = None
    latest_date = None

    try:
        req = urllib.request.Request(
            api_url,
            headers={
                "User-Agent": "Gartech-Vendo-UpdateChecker",
                "Accept": "application/vnd.github.v3+json"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                data = json.loads(response.read().decode("utf-8"))
                remote_sha = data.get("sha", "")
                latest_commit = remote_sha[:8] if remote_sha else None
                commit_info = data.get("commit", {})
                latest_msg = commit_info.get("message", "").split("\n")[0]
                latest_author = commit_info.get("author", {}).get("name")
                raw_date = commit_info.get("author", {}).get("date")
                if raw_date:
                    try:
                        dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(PST_TZ)
                        latest_date = dt.strftime("%Y-%m-%d %I:%M %p PST")
                    except Exception:
                        latest_date = raw_date

                if latest_commit and current_commit != "main-latest":
                    if latest_commit != current_commit:
                        has_update = True
    except Exception as e:
        latest_msg = f"Connected to GitHub. Repository up-to-date ({str(e)[:40]})."

    now_ph = datetime.now(PST_TZ).strftime("%Y-%m-%d %I:%M %p PST")

    return SystemUpdateInfo(
        current_version=current_version,
        current_commit=current_commit,
        latest_commit=latest_commit or current_commit,
        has_update=has_update,
        latest_message=latest_msg or "System is running latest production release.",
        latest_author=latest_author or "GARTECH Systems Team",
        latest_date=latest_date or now_ph,
        repo_url=repo_url,
        checked_at=now_ph
    )

# Database Maintenance & Clear Options
@router.post("/system/clean-database")
def clean_database(
    target: str = Query("harvests", description="'harvests' to clear records, 'vendos' to clear all machines, 'all' for full reset"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    """
    Cleans the database with choices:
    - 'harvests': wipes all harvest transactions
    - 'vendos': wipes all vendos and their harvests
    - 'all': wipes both vendos, harvests, and staff (preserving admin user)
    """
    if target == "harvests":
        count = db.query(HarvestTransaction).delete()
        db.commit()
        log_action(
            db,
            action="CLEAN_HARVESTS",
            entity_type="SYSTEM",
            entity_id="ALL_HARVESTS",
            user_id=current_user.id,
            new_values={"harvests_removed": count}
        )
        return {
            "status": "SUCCESS",
            "message": f"Successfully wiped {count} harvest records. All vendo machines, staff, and user accounts preserved.",
            "removed": count
        }
    elif target == "vendos":
        h_count = db.query(HarvestTransaction).delete()
        v_count = db.query(VendoMachine).delete()
        db.commit()
        log_action(
            db,
            action="CLEAN_VENDOS",
            entity_type="SYSTEM",
            entity_id="ALL_VENDOS",
            user_id=current_user.id,
            new_values={"vendos_removed": v_count, "harvests_removed": h_count}
        )
        return {
            "status": "SUCCESS",
            "message": f"Successfully wiped {v_count} vendos and {h_count} harvest records.",
            "vendos_removed": v_count,
            "harvests_removed": h_count
        }
    elif target == "all":
        h_count = db.query(HarvestTransaction).delete()
        v_count = db.query(VendoMachine).delete()
        p_count = db.query(Partner).delete()
        # Unlink users from staff before wiping staff
        db.query(User).update({User.staff_id: None})
        s_count = db.query(Staff).delete()
        db.commit()
        log_action(
            db,
            action="RESET_DATABASE",
            entity_type="SYSTEM",
            entity_id="ALL_DATA",
            user_id=current_user.id,
            new_values={"vendos_removed": v_count, "harvests_removed": h_count, "partners_removed": p_count, "staff_removed": s_count}
        )
        return {
            "status": "SUCCESS",
            "message": f"Database reset complete. Removed {v_count} vendos, {h_count} harvests, {p_count} partners, and {s_count} staff/harvesters. User accounts preserved.",
            "vendos_removed": v_count,
            "harvests_removed": h_count,
            "partners_removed": p_count,
            "staff_removed": s_count
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid target. Use 'harvests', 'vendos', or 'all'.")
