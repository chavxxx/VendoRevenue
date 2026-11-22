import os
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_
from datetime import date, datetime, timezone
from decimal import Decimal
from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, VendoMachine, Staff, 
    HarvestTransaction, HarvestStatus,
    RevenueShareConfiguration, SystemSetting
)
from app.schemas import (
    HarvestCreate, HarvestCalculationPreview, 
    HarvestApprovalRequest, HarvestVoidRequest, 
    HarvestResponse
)
from app.services.calculation import compute_revenue_distribution, to_decimal
from app.services.audit_service import log_action

router = APIRouter()

def get_active_revenue_config(db: Session):
    sys_setting = db.query(SystemSetting).first()
    if sys_setting:
        return Decimal("0.00"), sys_setting.staff_incentive_percentage, sys_setting.gartech_net_percentage
    config = db.query(RevenueShareConfiguration).filter(RevenueShareConfiguration.is_active == True).first()
    if config:
        return Decimal("0.00"), config.staff_incentive_percentage, config.gartech_net_percentage
    return (
        Decimal("0.00"),
        Decimal(str(settings.DEFAULT_STAFF_PERCENTAGE)),
        Decimal("95.00")
    )

def generate_transaction_ref(db: Session, harvest_date: date) -> str:
    date_str = harvest_date.strftime("%Y%m%d")
    prefix = f"TXN-{date_str}-"
    last_txn = (
        db.query(HarvestTransaction)
        .filter(HarvestTransaction.transaction_ref.like(f"{prefix}%"))
        .order_by(desc(HarvestTransaction.transaction_ref))
        .first()
    )
    if last_txn:
        try:
            seq = int(last_txn.transaction_ref.split("-")[-1]) + 1
        except Exception:
            seq = 1
    else:
        seq = 1
    return f"{prefix}{seq:04d}"

def serialize_harvest(t: HarvestTransaction) -> HarvestResponse:
    return HarvestResponse(
        id=t.id,
        transaction_ref=t.transaction_ref,
        vendo_id=t.vendo_id,
        vlan_id=t.vlan_id,
        vendo_name=t.vendo.vendo_name if t.vendo else None,
        partner_id=None,
        partner_name=None,
        harvester_id=t.harvester_id,
        harvester_name=t.harvester.full_name if t.harvester else None,
        encoded_by_user_id=t.encoded_by_user_id,
        encoded_by_name=t.encoded_by.full_name if t.encoded_by else None,
        harvest_date=t.harvest_date,
        harvest_period=t.harvest_period,
        gross_harvest=t.gross_harvest,
        partner_percentage=Decimal("0.00"),
        partner_share=Decimal("0.00"),
        staff_percentage=t.staff_percentage,
        staff_incentive=t.staff_incentive,
        gartech_percentage=t.gartech_percentage,
        gartech_net=t.gartech_net,
        status=t.status,
        remarks=t.remarks,
        rejection_reason=t.rejection_reason,
        void_reason=t.void_reason,
        approved_by_user_id=t.approved_by_user_id,
        approved_by_name=t.approved_by.full_name if t.approved_by else None,
        approved_at=t.approved_at,
        created_at=t.created_at
    )

@router.post("/preview", response_model=HarvestCalculationPreview)
def preview_harvest_computation(
    payload: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    gross = payload.get("gross_harvest", 0)
    _, s_pct, g_pct = get_active_revenue_config(db)
    p_pct = Decimal("0.00")
    
    if "staff_percentage" in payload and payload["staff_percentage"] is not None:
        s_pct = to_decimal(payload["staff_percentage"])
        g_pct = Decimal("100.00") - s_pct

    distribution = compute_revenue_distribution(gross, p_pct, s_pct, g_pct)
    return HarvestCalculationPreview(**distribution)

    distribution = compute_revenue_distribution(gross, p_pct, s_pct, g_pct)
    return HarvestCalculationPreview(**distribution)

@router.get("/", response_model=List[HarvestResponse])
def list_harvests(
    vlan_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    harvester_id: Optional[int] = Query(None),
    harvest_period: Optional[str] = Query(None, description="YYYY-MM"),
    status: Optional[HarvestStatus] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(HarvestTransaction).join(VendoMachine, HarvestTransaction.vendo_id == VendoMachine.id)
    
    if vlan_id:
        query = query.filter(HarvestTransaction.vlan_id == vlan_id)
    if partner_id:
        query = query.filter(HarvestTransaction.partner_id == partner_id)
    if harvester_id:
        query = query.filter(HarvestTransaction.harvester_id == harvester_id)
    if harvest_period:
        query = query.filter(HarvestTransaction.harvest_period == harvest_period)
    if status:
        query = query.filter(HarvestTransaction.status == status)
    if start_date:
        query = query.filter(HarvestTransaction.harvest_date >= start_date)
    if end_date:
        query = query.filter(HarvestTransaction.harvest_date <= end_date)
        
    txns = query.order_by(desc(HarvestTransaction.harvest_date), desc(HarvestTransaction.id)).offset(skip).limit(limit).all()
    return [serialize_harvest(t) for t in txns]

@router.get("/{id}", response_model=HarvestResponse)
def get_harvest_detail(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    t = db.query(HarvestTransaction).filter(HarvestTransaction.id == id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Harvest transaction not found")
    return serialize_harvest(t)

@router.post("/", response_model=HarvestResponse, status_code=status.HTTP_201_CREATED)
def encode_harvest(
    payload: HarvestCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    # Lookup Vendo Machine by VLAN ID
    vendo = db.query(VendoMachine).filter(VendoMachine.vlan_id == payload.vlan_id).first()
    if not vendo:
        raise HTTPException(status_code=404, detail=f"Vendo with VLAN {payload.vlan_id} does not exist")
        
    harvest_period = payload.harvest_date.strftime("%Y-%m")
    
    # Harvester is selected explicitly when encoding harvest
    harvester = db.query(Staff).filter(Staff.id == payload.harvester_id).first()
    if not harvester:
        raise HTTPException(status_code=400, detail=f"Selected harvester (ID {payload.harvester_id}) does not exist")
    harvester_id = harvester.id

    # Server-side revenue calculation (strict decimal exactness: 0% partner, 5% staff, 95% gartech)
    _, s_pct, g_pct = get_active_revenue_config(db)
    p_pct = Decimal("0.00")

    distribution = compute_revenue_distribution(
        gross_harvest=payload.gross_harvest,
        partner_percentage=p_pct,
        staff_percentage=s_pct,
        gartech_percentage=g_pct
    )
    
    transaction_ref = generate_transaction_ref(db, payload.harvest_date)
    
    # Final workflow: select date, select vendo, input income then submit. Immediately APPROVED.
    harvest = HarvestTransaction(
        transaction_ref=transaction_ref,
        vendo_id=vendo.id,
        vlan_id=vendo.vlan_id,
        partner_id=None,
        harvester_id=harvester_id,
        encoded_by_user_id=current_user.id,
        harvest_date=payload.harvest_date,
        harvest_period=harvest_period,
        gross_harvest=distribution["gross_harvest"],
        partner_percentage=Decimal("0.00"),
        partner_share=Decimal("0.00"),
        staff_percentage=distribution["staff_percentage"],
        staff_incentive=distribution["staff_incentive"],
        gartech_percentage=distribution["gartech_percentage"],
        gartech_net=distribution["gartech_net"],
        status=HarvestStatus.APPROVED,
        remarks=payload.remarks,
        approved_by_user_id=current_user.id,
        approved_at=datetime.now(timezone.utc)
    )
    db.add(harvest)
    db.commit()
    db.refresh(harvest)
    
    log_action(
        db,
        action="CREATE_HARVEST",
        entity_type="HARVEST",
        entity_id=harvest.transaction_ref,
        user_id=current_user.id,
        new_values={
            "vlan_id": harvest.vlan_id,
            "period": harvest.harvest_period,
            "gross": str(harvest.gross_harvest),
            "partner_share": str(harvest.partner_share),
            "staff_incentive": str(harvest.staff_incentive),
            "gartech_net": str(harvest.gartech_net),
            "status": harvest.status.value
        }
    )
    
    return serialize_harvest(harvest)

@router.post("/{id}/approve", response_model=HarvestResponse)
def approve_harvest(
    id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    harvest = db.query(HarvestTransaction).filter(HarvestTransaction.id == id).first()
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest transaction not found")
    if harvest.status == HarvestStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Transaction is already approved")
    if harvest.status == HarvestStatus.VOIDED:
        raise HTTPException(status_code=400, detail="Cannot approve a voided transaction")
        
    harvest.status = HarvestStatus.APPROVED
    harvest.approved_by_user_id = current_user.id
    harvest.approved_at = datetime.now(timezone.utc)
    harvest.rejection_reason = None
    db.commit()
    db.refresh(harvest)
    
    log_action(
        db,
        action="APPROVE_HARVEST",
        entity_type="HARVEST",
        entity_id=harvest.transaction_ref,
        user_id=current_user.id,
        new_values={"status": "APPROVED"}
    )
    return serialize_harvest(harvest)

@router.post("/{id}/reject", response_model=HarvestResponse)
def reject_harvest(
    id: int,
    payload: HarvestApprovalRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    harvest = db.query(HarvestTransaction).filter(HarvestTransaction.id == id).first()
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest transaction not found")
    if harvest.status == HarvestStatus.VOIDED:
        raise HTTPException(status_code=400, detail="Cannot reject a voided transaction")
        
    harvest.status = HarvestStatus.REJECTED
    harvest.rejection_reason = payload.reason
    db.commit()
    db.refresh(harvest)
    
    log_action(
        db,
        action="REJECT_HARVEST",
        entity_type="HARVEST",
        entity_id=harvest.transaction_ref,
        user_id=current_user.id,
        new_values={"status": "REJECTED", "reason": payload.reason}
    )
    return serialize_harvest(harvest)

@router.post("/{id}/void", response_model=HarvestResponse)
def void_harvest(
    id: int,
    payload: HarvestVoidRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    harvest = db.query(HarvestTransaction).filter(HarvestTransaction.id == id).first()
    if not harvest:
        raise HTTPException(status_code=404, detail="Harvest transaction not found")
        
    if harvest.status == HarvestStatus.VOIDED:
        raise HTTPException(status_code=400, detail="Transaction is already voided")
        
    old_status = harvest.status.value
    harvest.status = HarvestStatus.VOIDED
    harvest.void_reason = payload.void_reason
    
    db.commit()
    db.refresh(harvest)
    
    log_action(
        db,
        action="VOID_HARVEST",
        entity_type="HARVEST",
        entity_id=harvest.transaction_ref,
        user_id=current_user.id,
        old_values={"status": old_status},
        new_values={"status": "VOIDED", "reason": payload.void_reason}
    )
    
    return serialize_harvest(harvest)
