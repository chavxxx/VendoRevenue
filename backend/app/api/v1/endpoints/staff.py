from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, Staff, VendoMachine, 
    HarvestTransaction, HarvestStatus
)
from app.schemas import (
    StaffCreate, StaffUpdate, StaffResponse
)
from app.services.audit_service import log_action

router = APIRouter()

def compute_staff_financials(db: Session, staff_id: int):
    total_earned = (
        db.query(func.coalesce(func.sum(HarvestTransaction.staff_incentive), Decimal("0.00")))
        .filter(
            HarvestTransaction.harvester_id == staff_id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        .scalar()
    ) or Decimal("0.00")
    return total_earned

@router.get("/", response_model=List[StaffResponse])
def list_staff(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    role_type: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    query = db.query(Staff)
    if is_active is not None:
        query = query.filter(Staff.is_active == is_active)
    if role_type:
        query = query.filter(Staff.role_type == role_type)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(Staff.full_name.ilike(search_fmt) | Staff.staff_code.ilike(search_fmt))
        
    staff_members = query.order_by(Staff.full_name.asc()).offset(skip).limit(limit).all()
    results = []
    
    for s in staff_members:
        earned = compute_staff_financials(db, s.id)
        v_count = db.query(VendoMachine).filter(VendoMachine.assigned_harvester_id == s.id).count()
        results.append(
            StaffResponse(
                id=s.id,
                staff_code=s.staff_code,
                full_name=s.full_name,
                phone=s.phone,
                email=s.email,
                role_type=s.role_type,
                default_incentive_percentage=s.default_incentive_percentage,
                is_active=s.is_active,
                created_at=s.created_at,
                assigned_vendos_count=v_count,
                total_incentives_earned=earned
            )
        )
    return results

@router.get("/{id}", response_model=StaffResponse)
def get_staff_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    s = db.query(Staff).filter(Staff.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    earned = compute_staff_financials(db, s.id)
    v_count = db.query(VendoMachine).filter(VendoMachine.assigned_harvester_id == s.id).count()
    
    return StaffResponse(
        id=s.id,
        staff_code=s.staff_code,
        full_name=s.full_name,
        phone=s.phone,
        email=s.email,
        role_type=s.role_type,
        default_incentive_percentage=s.default_incentive_percentage,
        is_active=s.is_active,
        created_at=s.created_at,
        assigned_vendos_count=v_count,
        total_incentives_earned=earned
    )

@router.post("/", response_model=StaffResponse, status_code=status.HTTP_201_CREATED)
def create_staff(
    payload: StaffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    existing = db.query(Staff).filter(Staff.staff_code == payload.staff_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Staff code {payload.staff_code} already exists")
        
    staff = Staff(**payload.model_dump())
    db.add(staff)
    db.commit()
    db.refresh(staff)
    
    log_action(
        db,
        action="CREATE",
        entity_type="STAFF",
        entity_id=str(staff.id),
        user_id=current_user.id,
        new_values=payload.model_dump()
    )
    
    return StaffResponse(
        id=staff.id,
        staff_code=staff.staff_code,
        full_name=staff.full_name,
        phone=staff.phone,
        email=staff.email,
        role_type=staff.role_type,
        default_incentive_percentage=staff.default_incentive_percentage,
        is_active=staff.is_active,
        created_at=staff.created_at,
        assigned_vendos_count=0,
        total_incentives_earned=Decimal("0.00")
    )

@router.put("/{id}", response_model=StaffResponse)
def update_staff(
    id: int,
    payload: StaffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    staff = db.query(Staff).filter(Staff.id == id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    old_vals = {k: getattr(staff, k) for k in update_data.keys()}
    
    for k, v in update_data.items():
        setattr(staff, k, v)
        
    db.commit()
    db.refresh(staff)
    
    log_action(
        db,
        action="UPDATE",
        entity_type="STAFF",
        entity_id=str(staff.id),
        user_id=current_user.id,
        old_values=old_vals,
        new_values=update_data
    )
    
    earned = compute_staff_financials(db, staff.id)
    v_count = db.query(VendoMachine).filter(VendoMachine.assigned_harvester_id == staff.id).count()
    
    return StaffResponse(
        id=staff.id,
        staff_code=staff.staff_code,
        full_name=staff.full_name,
        phone=staff.phone,
        email=staff.email,
        role_type=staff.role_type,
        default_incentive_percentage=staff.default_incentive_percentage,
        is_active=staff.is_active,
        created_at=staff.created_at,
        assigned_vendos_count=v_count,
        total_incentives_earned=earned
    )

@router.delete("/{id}")
def delete_staff(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    """
    Deletes a staff/harvester member, unlinking associated machines and users.
    """
    staff = db.query(Staff).filter(Staff.id == id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")

    # Unlink from users
    db.query(User).filter(User.staff_id == id).update({User.staff_id: None})
    # Unlink from assigned vendos
    db.query(VendoMachine).filter(VendoMachine.assigned_harvester_id == id).update({VendoMachine.assigned_harvester_id: None})
    db.query(VendoMachine).filter(VendoMachine.assigned_staff_id == id).update({VendoMachine.assigned_staff_id: None})

    db.delete(staff)
    db.commit()

    log_action(
        db,
        action="DELETE_STAFF",
        entity_type="STAFF",
        entity_id=str(id),
        user_id=current_user.id,
        new_values={"full_name": staff.full_name, "staff_code": staff.staff_code}
    )

    return {"status": "SUCCESS", "message": f"Staff member {staff.full_name} deleted successfully."}
