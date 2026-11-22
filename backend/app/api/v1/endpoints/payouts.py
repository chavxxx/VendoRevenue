from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from datetime import date, datetime
from decimal import Decimal
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, Partner, Staff, 
    HarvestTransaction, HarvestStatus, 
    PartnerPayout, StaffPayout, PaymentMethod
)
from app.schemas import (
    PartnerPayoutCreate, StaffPayoutCreate, 
    PartnerPayoutResponse, StaffPayoutResponse
)
from app.services.audit_service import log_action

router = APIRouter()

def generate_payout_ref(db: Session, prefix: str, payout_date: date) -> str:
    date_str = payout_date.strftime("%Y%m%d")
    full_prefix = f"{prefix}-{date_str}-"
    last_payout = None
    if "PRT" in prefix:
        last_payout = db.query(PartnerPayout).filter(PartnerPayout.payout_ref.like(f"{full_prefix}%")).order_by(desc(PartnerPayout.payout_ref)).first()
    else:
        last_payout = db.query(StaffPayout).filter(StaffPayout.payout_ref.like(f"{full_prefix}%")).order_by(desc(StaffPayout.payout_ref)).first()
        
    seq = 1
    if last_payout:
        try:
            seq = int(last_payout.payout_ref.split("-")[-1]) + 1
        except Exception:
            seq = 1
    return f"{full_prefix}{seq:04d}"

# --- PARTNER PAYOUTS ---

@router.get("/partner/outstanding")
def get_partners_with_outstanding_shares(
    harvest_period: Optional[str] = Query(None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN_ACCOUNTING]))
):
    """Calculates approved partner earnings vs actual payouts to identify outstanding balances."""
    partners = db.query(Partner).filter(Partner.is_active == True).all()
    results = []
    
    for p in partners:
        # Query total approved earnings
        earn_query = db.query(func.coalesce(func.sum(HarvestTransaction.partner_share), Decimal("0.00"))).filter(
            HarvestTransaction.partner_id == p.id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        # Query total paid
        paid_query = db.query(func.coalesce(func.sum(PartnerPayout.amount_paid), Decimal("0.00"))).filter(
            PartnerPayout.partner_id == p.id
        )
        
        if harvest_period:
            earn_query = earn_query.filter(HarvestTransaction.harvest_period == harvest_period)
            paid_query = paid_query.filter(PartnerPayout.harvest_period == harvest_period)
            
        total_earned = earn_query.scalar() or Decimal("0.00")
        total_paid = paid_query.scalar() or Decimal("0.00")
        balance = total_earned - total_paid
        
        if total_earned > 0 or total_paid > 0:
            results.append({
                "partner_id": p.id,
                "partner_code": p.partner_code,
                "partner_name": p.name,
                "phone": p.phone,
                "gcash_number": p.gcash_number,
                "bank_name": p.bank_name,
                "bank_account_number": p.bank_account_number,
                "harvest_period": harvest_period or "ALL_TIME",
                "total_earned": total_earned,
                "total_paid": total_paid,
                "outstanding_balance": balance
            })
            
    return results

@router.get("/partner", response_model=List[PartnerPayoutResponse])
def list_partner_payouts(
    partner_id: Optional[int] = Query(None),
    harvest_period: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(PartnerPayout).join(Partner)
    
    if current_user.role == UserRole.PARTNER:
        if not current_user.partner_id:
            return []
        query = query.filter(PartnerPayout.partner_id == current_user.partner_id)
    elif partner_id:
        query = query.filter(PartnerPayout.partner_id == partner_id)
        
    if harvest_period:
        query = query.filter(PartnerPayout.harvest_period == harvest_period)
        
    payouts = query.order_by(desc(PartnerPayout.payment_date), desc(PartnerPayout.id)).offset(skip).limit(limit).all()
    
    return [
        PartnerPayoutResponse(
            id=p.id,
            payout_ref=p.payout_ref,
            partner_id=p.partner_id,
            partner_name=p.partner.name if p.partner else None,
            vlan_id=p.vlan_id,
            harvest_period=p.harvest_period,
            total_share_amount=p.total_share_amount,
            amount_paid=p.amount_paid,
            remaining_balance=p.remaining_balance,
            payment_date=p.payment_date,
            payment_method=p.payment_method,
            reference_number=p.reference_number,
            remarks=p.remarks,
            receipt_file_path=p.receipt_file_path,
            paid_by_name=p.paid_by.full_name if p.paid_by else None,
            created_at=p.created_at
        ) for p in payouts
    ]

@router.post("/partner", response_model=PartnerPayoutResponse, status_code=status.HTTP_201_CREATED)
def record_partner_payout(
    payload: PartnerPayoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN_ACCOUNTING]))
):
    partner = db.query(Partner).filter(Partner.id == payload.partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
        
    if payload.amount_paid <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Amount paid must be greater than zero")
        
    # Calculate total earned for this partner
    total_earned = (
        db.query(func.coalesce(func.sum(HarvestTransaction.partner_share), Decimal("0.00")))
        .filter(
            HarvestTransaction.partner_id == partner.id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        .scalar()
    ) or Decimal("0.00")
    
    # Calculate previously paid
    prev_paid = (
        db.query(func.coalesce(func.sum(PartnerPayout.amount_paid), Decimal("0.00")))
        .filter(PartnerPayout.partner_id == partner.id)
        .scalar()
    ) or Decimal("0.00")
    
    remaining_balance = total_earned - prev_paid - payload.amount_paid
    payout_ref = generate_payout_ref(db, "PAY-PRT", payload.payment_date)
    
    payout = PartnerPayout(
        payout_ref=payout_ref,
        partner_id=payload.partner_id,
        vlan_id=payload.vlan_id,
        harvest_period=payload.harvest_period,
        total_share_amount=total_earned,
        amount_paid=payload.amount_paid,
        remaining_balance=remaining_balance,
        payment_date=payload.payment_date,
        payment_method=payload.payment_method,
        reference_number=payload.reference_number,
        remarks=payload.remarks,
        paid_by_user_id=current_user.id
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    
    log_action(
        db,
        action="RECORD_PARTNER_PAYOUT",
        entity_type="PAYOUT",
        entity_id=payout.payout_ref,
        user_id=current_user.id,
        new_values={
            "partner": partner.name,
            "amount_paid": str(payload.amount_paid),
            "remaining_balance": str(remaining_balance),
            "method": payload.payment_method.value
        }
    )
    
    return PartnerPayoutResponse(
        id=payout.id,
        payout_ref=payout.payout_ref,
        partner_id=payout.partner_id,
        partner_name=partner.name,
        vlan_id=payout.vlan_id,
        harvest_period=payout.harvest_period,
        total_share_amount=payout.total_share_amount,
        amount_paid=payout.amount_paid,
        remaining_balance=payout.remaining_balance,
        payment_date=payout.payment_date,
        payment_method=payout.payment_method,
        reference_number=payout.reference_number,
        remarks=payout.remarks,
        receipt_file_path=payout.receipt_file_path,
        paid_by_name=current_user.full_name,
        created_at=payout.created_at
    )

# --- STAFF PAYOUTS ---

@router.get("/staff/outstanding")
def get_staff_with_outstanding_incentives(
    harvest_period: Optional[str] = Query(None, description="YYYY-MM"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN_ACCOUNTING]))
):
    staff_list = db.query(Staff).filter(Staff.is_active == True).all()
    results = []
    
    for s in staff_list:
        earn_query = db.query(func.coalesce(func.sum(HarvestTransaction.staff_incentive), Decimal("0.00"))).filter(
            HarvestTransaction.harvester_id == s.id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        paid_query = db.query(func.coalesce(func.sum(StaffPayout.amount_paid), Decimal("0.00"))).filter(
            StaffPayout.staff_id == s.id
        )
        
        if harvest_period:
            earn_query = earn_query.filter(HarvestTransaction.harvest_period == harvest_period)
            paid_query = paid_query.filter(StaffPayout.harvest_period == harvest_period)
            
        total_earned = earn_query.scalar() or Decimal("0.00")
        total_paid = paid_query.scalar() or Decimal("0.00")
        balance = total_earned - total_paid
        
        if total_earned > 0 or total_paid > 0:
            results.append({
                "staff_id": s.id,
                "staff_code": s.staff_code,
                "staff_name": s.full_name,
                "phone": s.phone,
                "role_type": s.role_type,
                "harvest_period": harvest_period or "ALL_TIME",
                "total_earned": total_earned,
                "total_paid": total_paid,
                "outstanding_balance": balance
            })
            
    return results

@router.get("/staff", response_model=List[StaffPayoutResponse])
def list_staff_payouts(
    staff_id: Optional[int] = Query(None),
    harvest_period: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN_ACCOUNTING]))
):
    query = db.query(StaffPayout).join(Staff)
    if staff_id:
        query = query.filter(StaffPayout.staff_id == staff_id)
    if harvest_period:
        query = query.filter(StaffPayout.harvest_period == harvest_period)
        
    payouts = query.order_by(desc(StaffPayout.payment_date), desc(StaffPayout.id)).offset(skip).limit(limit).all()
    
    return [
        StaffPayoutResponse(
            id=p.id,
            payout_ref=p.payout_ref,
            staff_id=p.staff_id,
            staff_name=p.staff.full_name if p.staff else None,
            harvest_period=p.harvest_period,
            total_incentive_amount=p.total_incentive_amount,
            amount_paid=p.amount_paid,
            remaining_balance=p.remaining_balance,
            payment_date=p.payment_date,
            payment_method=p.payment_method,
            reference_number=p.reference_number,
            remarks=p.remarks,
            paid_by_name=p.paid_by.full_name if p.paid_by else None,
            created_at=p.created_at
        ) for p in payouts
    ]

@router.post("/staff", response_model=StaffPayoutResponse, status_code=status.HTTP_201_CREATED)
def record_staff_payout(
    payload: StaffPayoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.SUPER_ADMIN, UserRole.ADMIN_ACCOUNTING]))
):
    staff = db.query(Staff).filter(Staff.id == payload.staff_id).first()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff member not found")
        
    if payload.amount_paid <= Decimal("0.00"):
        raise HTTPException(status_code=400, detail="Amount paid must be greater than zero")
        
    total_earned = (
        db.query(func.coalesce(func.sum(HarvestTransaction.staff_incentive), Decimal("0.00")))
        .filter(
            HarvestTransaction.harvester_id == staff.id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        .scalar()
    ) or Decimal("0.00")
    
    prev_paid = (
        db.query(func.coalesce(func.sum(StaffPayout.amount_paid), Decimal("0.00")))
        .filter(StaffPayout.staff_id == staff.id)
        .scalar()
    ) or Decimal("0.00")
    
    remaining_balance = total_earned - prev_paid - payload.amount_paid
    payout_ref = generate_payout_ref(db, "PAY-STF", payload.payment_date)
    
    payout = StaffPayout(
        payout_ref=payout_ref,
        staff_id=payload.staff_id,
        harvest_period=payload.harvest_period,
        total_incentive_amount=total_earned,
        amount_paid=payload.amount_paid,
        remaining_balance=remaining_balance,
        payment_date=payload.payment_date,
        payment_method=payload.payment_method,
        reference_number=payload.reference_number,
        remarks=payload.remarks,
        paid_by_user_id=current_user.id
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    
    log_action(
        db,
        action="RECORD_STAFF_PAYOUT",
        entity_type="PAYOUT",
        entity_id=payout.payout_ref,
        user_id=current_user.id,
        new_values={
            "staff": staff.full_name,
            "amount_paid": str(payload.amount_paid),
            "remaining_balance": str(remaining_balance)
        }
    )
    
    return StaffPayoutResponse(
        id=payout.id,
        payout_ref=payout.payout_ref,
        staff_id=payout.staff_id,
        staff_name=staff.full_name,
        harvest_period=payout.harvest_period,
        total_incentive_amount=payout.total_incentive_amount,
        amount_paid=payout.amount_paid,
        remaining_balance=payout.remaining_balance,
        payment_date=payout.payment_date,
        payment_method=payout.payment_method,
        reference_number=payout.reference_number,
        remarks=payout.remarks,
        paid_by_name=current_user.full_name,
        created_at=payout.created_at
    )
