import io
import csv
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc
from datetime import date, datetime, timezone
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, VendoMachine, Partner, Staff, 
    HarvestTransaction, HarvestStatus, VendoStatus
)
from app.schemas import (
    VendoCreate, VendoUpdate, VendoResponse
)
from app.services.audit_service import log_action

router = APIRouter()

@router.get("/stats")
def get_vendo_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(VendoMachine)
    total = query.count()
    active = query.filter(VendoMachine.status == VendoStatus.ACTIVE).count()
    inactive = query.filter(VendoMachine.status != VendoStatus.ACTIVE).count()
    return {
        "total": total,
        "active": active,
        "inactive": inactive
    }

@router.get("/", response_model=List[VendoResponse])
def list_vendos(
    search: Optional[str] = Query(None, description="Search by VLAN, partner name, or address"),
    partner_id: Optional[int] = Query(None),
    status: Optional[VendoStatus] = Query(None),
    city: Optional[str] = Query(None),
    assigned_harvester_id: Optional[int] = Query(None),
    sort_by: str = Query("vlan_id", description="Field to sort by"),
    sort_order: str = Query("asc", description="asc or desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(VendoMachine).join(Partner, VendoMachine.partner_id == Partner.id)
    
    if partner_id:
        query = query.filter(VendoMachine.partner_id == partner_id)
    if status:
        query = query.filter(VendoMachine.status == status)
    if city:
        query = query.filter(VendoMachine.city_municipality.ilike(f"%{city}%"))
    if assigned_harvester_id:
        query = query.filter(VendoMachine.assigned_harvester_id == assigned_harvester_id)
        
    if search:
        search_fmt = f"%{search}%"
        if search.isdigit():
            query = query.filter(
                or_(
                    VendoMachine.vlan_id == int(search),
                    VendoMachine.vendo_name.ilike(search_fmt),
                    Partner.name.ilike(search_fmt),
                    VendoMachine.complete_address.ilike(search_fmt)
                )
            )
        else:
            query = query.filter(
                or_(
                    VendoMachine.vendo_name.ilike(search_fmt),
                    Partner.name.ilike(search_fmt),
                    VendoMachine.complete_address.ilike(search_fmt),
                    VendoMachine.city_municipality.ilike(search_fmt)
                )
            )
            
    sort_col = getattr(VendoMachine, sort_by, VendoMachine.vlan_id)
    if sort_order.lower() == "desc":
        query = query.order_by(desc(sort_col))
    else:
        query = query.order_by(asc(sort_col))
        
    vendos = query.offset(skip).limit(limit).all()
    
    results = []
    for v in vendos:
        last_harvest = (
            db.query(HarvestTransaction)
            .filter(HarvestTransaction.vendo_id == v.id, HarvestTransaction.status == HarvestStatus.APPROVED)
            .order_by(desc(HarvestTransaction.harvest_date))
            .first()
        )
        
        results.append(
            VendoResponse(
                id=v.id,
                vlan_id=v.vlan_id,
                vendo_name=v.vendo_name,
                partner_id=v.partner_id,
                partner_name=v.partner.name if v.partner else None,
                complete_address=v.complete_address,
                city_municipality=v.city_municipality,
                province=v.province,
                latitude=v.latitude,
                longitude=v.longitude,
                assigned_staff_id=v.assigned_staff_id,
                assigned_harvester_id=v.assigned_harvester_id,
                harvester_name=v.assigned_harvester.full_name if v.assigned_harvester else None,
                installation_date=v.installation_date,
                status=v.status,
                remarks=v.remarks,
                created_at=v.created_at,
                last_harvest_date=last_harvest.harvest_date if last_harvest else None,
                last_gross_harvest=last_harvest.gross_harvest if last_harvest else None,
                last_partner_share=last_harvest.partner_share if last_harvest else None
            )
        )
    return results

@router.get("/{vlan_id}", response_model=VendoResponse)
def get_vendo_by_vlan(
    vlan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    vendo = db.query(VendoMachine).filter(VendoMachine.vlan_id == vlan_id).first()
    if not vendo:
        raise HTTPException(status_code=404, detail=f"Vendo with VLAN {vlan_id} not found")
        
    last_harvest = (
        db.query(HarvestTransaction)
        .filter(HarvestTransaction.vendo_id == vendo.id, HarvestTransaction.status == HarvestStatus.APPROVED)
        .order_by(desc(HarvestTransaction.harvest_date))
        .first()
    )
    
    return VendoResponse(
        id=vendo.id,
        vlan_id=vendo.vlan_id,
        vendo_name=vendo.vendo_name,
        partner_id=vendo.partner_id,
        partner_name=vendo.partner.name if vendo.partner else None,
        complete_address=vendo.complete_address,
        city_municipality=vendo.city_municipality,
        province=vendo.province,
        latitude=vendo.latitude,
        longitude=vendo.longitude,
        assigned_staff_id=vendo.assigned_staff_id,
        assigned_harvester_id=vendo.assigned_harvester_id,
        harvester_name=vendo.assigned_harvester.full_name if vendo.assigned_harvester else None,
        installation_date=vendo.installation_date,
        status=vendo.status,
        remarks=vendo.remarks,
        created_at=vendo.created_at,
        last_harvest_date=last_harvest.harvest_date if last_harvest else None,
        last_gross_harvest=last_harvest.gross_harvest if last_harvest else None,
        last_partner_share=last_harvest.partner_share if last_harvest else None
    )

@router.post("/", response_model=VendoResponse, status_code=status.HTTP_201_CREATED)
def create_vendo(
    payload: VendoCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    existing = db.query(VendoMachine).filter(VendoMachine.vlan_id == payload.vlan_id).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"VLAN ID {payload.vlan_id} already exists")
        
    partner = db.query(Partner).filter(Partner.id == payload.partner_id).first()
    if not partner:
        raise HTTPException(status_code=400, detail="Specified partner does not exist")
        
    vendo = VendoMachine(**payload.model_dump())
    db.add(vendo)
    db.commit()
    db.refresh(vendo)
    
    log_action(
        db,
        action="CREATE",
        entity_type="VENDO",
        entity_id=str(vendo.vlan_id),
        user_id=current_user.id,
        new_values=payload.model_dump()
    )
    
    return VendoResponse(
        id=vendo.id,
        vlan_id=vendo.vlan_id,
        vendo_name=vendo.vendo_name,
        partner_id=vendo.partner_id,
        partner_name=partner.name,
        complete_address=vendo.complete_address,
        city_municipality=vendo.city_municipality,
        province=vendo.province,
        latitude=vendo.latitude,
        longitude=vendo.longitude,
        assigned_staff_id=vendo.assigned_staff_id,
        assigned_harvester_id=vendo.assigned_harvester_id,
        harvester_name=vendo.assigned_harvester.full_name if vendo.assigned_harvester else None,
        installation_date=vendo.installation_date,
        status=vendo.status,
        remarks=vendo.remarks,
        created_at=vendo.created_at
    )

@router.put("/{vlan_id}", response_model=VendoResponse)
def update_vendo(
    vlan_id: int,
    payload: VendoUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    vendo = db.query(VendoMachine).filter(VendoMachine.vlan_id == vlan_id).first()
    if not vendo:
        raise HTTPException(status_code=404, detail="Vendo not found")
        
    update_data = payload.model_dump(exclude_unset=True)
    if "vlan_id" in update_data and update_data["vlan_id"] != vlan_id:
        existing = db.query(VendoMachine).filter(VendoMachine.vlan_id == update_data["vlan_id"]).first()
        if existing:
            raise HTTPException(status_code=400, detail=f"VLAN ID {update_data['vlan_id']} is already in use")
            
    old_vals = {k: getattr(vendo, k) for k in update_data.keys()}
    for k, v in update_data.items():
        setattr(vendo, k, v)
        
    db.commit()
    db.refresh(vendo)
    
    log_action(
        db,
        action="UPDATE",
        entity_type="VENDO",
        entity_id=str(vendo.vlan_id),
        user_id=current_user.id,
        old_values=old_vals,
        new_values=update_data
    )
    
    return VendoResponse(
        id=vendo.id,
        vlan_id=vendo.vlan_id,
        vendo_name=vendo.vendo_name,
        partner_id=vendo.partner_id,
        partner_name=vendo.partner.name if vendo.partner else None,
        complete_address=vendo.complete_address,
        city_municipality=vendo.city_municipality,
        province=vendo.province,
        latitude=vendo.latitude,
        longitude=vendo.longitude,
        assigned_staff_id=vendo.assigned_staff_id,
        assigned_harvester_id=vendo.assigned_harvester_id,
        harvester_name=vendo.assigned_harvester.full_name if vendo.assigned_harvester else None,
        installation_date=vendo.installation_date,
        status=vendo.status,
        remarks=vendo.remarks,
        created_at=vendo.created_at
    )

@router.delete("/{vlan_id}")
def archive_vendo(
    vlan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN]))
):
    vendo = db.query(VendoMachine).filter(VendoMachine.vlan_id == vlan_id).first()
    if not vendo:
        raise HTTPException(status_code=404, detail="Vendo not found")
        
    has_harvests = db.query(HarvestTransaction).filter(HarvestTransaction.vendo_id == vendo.id).first()
    if has_harvests:
        vendo.status = VendoStatus.REMOVED
        db.commit()
        log_action(
            db,
            action="ARCHIVE",
            entity_type="VENDO",
            entity_id=str(vlan_id),
            user_id=current_user.id,
            new_values={"status": "REMOVED"}
        )
        return {"status": "SUCCESS", "message": f"Vendo VLAN {vlan_id} has existing harvest history; marked as REMOVED (archived)"}
    else:
        db.delete(vendo)
        db.commit()
        log_action(
            db,
            action="DELETE",
            entity_type="VENDO",
            entity_id=str(vlan_id),
            user_id=current_user.id
        )
        return {"status": "SUCCESS", "message": f"Vendo VLAN {vlan_id} deleted successfully"}

@router.post("/import/csv")
async def import_vendos_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    content = await file.read()
    decoded = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(decoded))
    
    created_count = 0
    updated_count = 0
    errors = []
    
    for row_idx, row in enumerate(reader, start=2):
        try:
            vlan_id = int(row.get("vlan_id") or row.get("VLAN") or 0)
            if not vlan_id:
                errors.append(f"Row {row_idx}: Missing or invalid VLAN ID")
                continue
                
            vendo_name = row.get("vendo_name") or f"Vendo VLAN {vlan_id}"
            partner_name = (row.get("partner_name") or "").strip()
            address = (row.get("address") or row.get("complete_address") or "Valencia, Bukidnon").strip()
            city = (row.get("city") or "Valencia").strip()
            province = (row.get("province") or "Bukidnon").strip()
            status_val = VendoStatus.ACTIVE
            
            partner = db.query(Partner).filter(Partner.name.ilike(partner_name)).first()
            if not partner and partner_name:
                code_count = db.query(Partner).count() + 1
                partner = Partner(
                    partner_code=f"PRT-{code_count:03d}",
                    name=partner_name,
                    address=address,
                    city=city,
                    province=province
                )
                db.add(partner)
                db.flush()
            elif not partner:
                partner = db.query(Partner).first()
                if not partner:
                    errors.append(f"Row {row_idx}: No partner available to assign")
                    continue
                    
            existing = db.query(VendoMachine).filter(VendoMachine.vlan_id == vlan_id).first()
            if existing:
                existing.vendo_name = vendo_name
                existing.partner_id = partner.id
                existing.complete_address = address
                existing.city_municipality = city
                existing.province = province
                updated_count += 1
            else:
                new_vendo = VendoMachine(
                    vlan_id=vlan_id,
                    vendo_name=vendo_name,
                    partner_id=partner.id,
                    complete_address=address,
                    city_municipality=city,
                    province=province,
                    installation_date=date.today(),
                    status=status_val
                )
                db.add(new_vendo)
                created_count += 1
        except Exception as e:
            errors.append(f"Row {row_idx}: {str(e)}")
            
    db.commit()
    return {
        "status": "SUCCESS",
        "created": created_count,
        "updated": updated_count,
        "errors": errors
    }

@router.get("/export/csv")
def export_vendos_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    vendos = db.query(VendoMachine).join(Partner).order_by(VendoMachine.vlan_id.asc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "VLAN ID", "Vendo Name", "Partner Code", "Partner Name", 
        "Address", "City", "Province", "Status", "Installation Date", "Remarks"
    ])
    
    for v in vendos:
        writer.writerow([
            v.vlan_id,
            v.vendo_name,
            v.partner.partner_code if v.partner else "",
            v.partner.name if v.partner else "",
            v.complete_address,
            v.city_municipality,
            v.province,
            v.status.value,
            v.installation_date.isoformat() if v.installation_date else "",
            v.remarks or ""
        ])
        
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=gartech_vendos_{date.today().isoformat()}.csv"}
    )
