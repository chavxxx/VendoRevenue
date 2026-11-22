from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from decimal import Decimal
from datetime import date
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, Partner, VendoMachine, 
    HarvestTransaction, HarvestStatus
)
from app.schemas import (
    PartnerCreate, PartnerUpdate, PartnerResponse
)
from app.services.audit_service import log_action

router = APIRouter()

def compute_partner_financials(db: Session, partner_id: int):
    total_earnings = (
        db.query(func.coalesce(func.sum(HarvestTransaction.partner_share), Decimal("0.00")))
        .filter(
            HarvestTransaction.partner_id == partner_id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        .scalar()
    ) or Decimal("0.00")
    return total_earnings

@router.get("/", response_model=List[PartnerResponse])
def list_partners(
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    query = db.query(Partner)
    if is_active is not None:
        query = query.filter(Partner.is_active == is_active)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(Partner.name.ilike(search_fmt) | Partner.partner_code.ilike(search_fmt))
        
    partners = query.order_by(Partner.name.asc()).offset(skip).limit(limit).all()
    results = []
    
    for p in partners:
        earnings = compute_partner_financials(db, p.id)
        v_count = db.query(VendoMachine).filter(VendoMachine.partner_id == p.id).count()
        results.append(
            PartnerResponse(
                id=p.id,
                partner_code=p.partner_code,
                name=p.name,
                contact_person=p.contact_person,
                phone=p.phone,
                email=p.email,
                address=p.address,
                city=p.city,
                province=p.province,
                default_share_percentage=p.default_share_percentage,
                bank_name=p.bank_name,
                bank_account_name=p.bank_account_name,
                bank_account_number=p.bank_account_number,
                gcash_number=p.gcash_number,
                is_active=p.is_active,
                created_at=p.created_at,
                vendo_count=v_count,
                total_earnings=earnings
            )
        )
    return results

@router.get("/{id}", response_model=PartnerResponse)
def get_partner(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    p = db.query(Partner).filter(Partner.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Partner not found")
        
    earnings = compute_partner_financials(db, p.id)
    v_count = db.query(VendoMachine).filter(VendoMachine.partner_id == p.id).count()
    
    return PartnerResponse(
        id=p.id,
        partner_code=p.partner_code,
        name=p.name,
        contact_person=p.contact_person,
        phone=p.phone,
        email=p.email,
        address=p.address,
        city=p.city,
        province=p.province,
        default_share_percentage=p.default_share_percentage,
        bank_name=p.bank_name,
        bank_account_name=p.bank_account_name,
        bank_account_number=p.bank_account_number,
        gcash_number=p.gcash_number,
        is_active=p.is_active,
        created_at=p.created_at,
        vendo_count=v_count,
        total_earnings=earnings
    )

@router.post("/", response_model=PartnerResponse, status_code=status.HTTP_201_CREATED)
def create_partner(
    payload: PartnerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    existing = db.query(Partner).filter(Partner.partner_code == payload.partner_code).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Partner code {payload.partner_code} already exists")
        
    partner = Partner(**payload.model_dump())
    db.add(partner)
    db.commit()
    db.refresh(partner)
    
    log_action(
        db,
        action="CREATE",
        entity_type="PARTNER",
        entity_id=str(partner.id),
        user_id=current_user.id,
        new_values=payload.model_dump()
    )
    
    return PartnerResponse(
        id=partner.id,
        partner_code=partner.partner_code,
        name=partner.name,
        contact_person=partner.contact_person,
        phone=partner.phone,
        email=partner.email,
        address=partner.address,
        city=partner.city,
        province=partner.province,
        default_share_percentage=partner.default_share_percentage,
        bank_name=partner.bank_name,
        bank_account_name=partner.bank_account_name,
        bank_account_number=partner.bank_account_number,
        gcash_number=partner.gcash_number,
        is_active=partner.is_active,
        created_at=partner.created_at,
        vendo_count=0,
        total_earnings=Decimal("0.00")
    )

@router.put("/{id}", response_model=PartnerResponse)
def update_partner(
    id: int,
    payload: PartnerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    partner = db.query(Partner).filter(Partner.id == id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    old_vals = {k: getattr(partner, k) for k in update_data.keys()}
    
    for k, v in update_data.items():
        setattr(partner, k, v)
        
    db.commit()
    db.refresh(partner)
    
    log_action(
        db,
        action="UPDATE",
        entity_type="PARTNER",
        entity_id=str(partner.id),
        user_id=current_user.id,
        old_values=old_vals,
        new_values=update_data
    )
    
    earnings = compute_partner_financials(db, partner.id)
    v_count = db.query(VendoMachine).filter(VendoMachine.partner_id == partner.id).count()
    
    return PartnerResponse(
        id=partner.id,
        partner_code=partner.partner_code,
        name=partner.name,
        contact_person=partner.contact_person,
        phone=partner.phone,
        email=partner.email,
        address=partner.address,
        city=partner.city,
        province=partner.province,
        default_share_percentage=partner.default_share_percentage,
        bank_name=partner.bank_name,
        bank_account_name=partner.bank_account_name,
        bank_account_number=partner.bank_account_number,
        gcash_number=partner.gcash_number,
        is_active=partner.is_active,
        created_at=partner.created_at,
        vendo_count=v_count,
        total_earnings=earnings
    )
