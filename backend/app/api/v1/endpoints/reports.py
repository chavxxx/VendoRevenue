from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import date, datetime, timedelta
from decimal import Decimal
import io
import csv

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, VendoMachine, Partner, Staff, 
    HarvestTransaction, HarvestStatus, VendoStatus
)
from app.services.report_generator import generate_harvest_excel, generate_harvest_pdf

router = APIRouter()

def get_report_records(
    db: Session,
    scope: str = "all",
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    vlan_id: Optional[int] = None,
    partner_id: Optional[int] = None,
    harvester_id: Optional[int] = None,
    city: Optional[str] = None,
    status: Optional[HarvestStatus] = None
):
    query = (
        db.query(HarvestTransaction)
        .join(VendoMachine, HarvestTransaction.vendo_id == VendoMachine.id)
        .outerjoin(Staff, HarvestTransaction.harvester_id == Staff.id)
    )
    
    # Apply date filters
    if start_date:
        query = query.filter(HarvestTransaction.harvest_date >= start_date)
    if end_date:
        query = query.filter(HarvestTransaction.harvest_date <= end_date)
        
    # Apply scope filters
    if scope == "individual_harvester" and harvester_id:
        query = query.filter(HarvestTransaction.harvester_id == harvester_id)
    elif scope == "group_location" and city:
        query = query.filter(VendoMachine.city_municipality.ilike(f"%{city}%"))
    else:
        # Default/all scope with optional granular filters
        if vlan_id:
            query = query.filter(HarvestTransaction.vlan_id == vlan_id)
        if harvester_id:
            query = query.filter(HarvestTransaction.harvester_id == harvester_id)
        if city:
            query = query.filter(VendoMachine.city_municipality.ilike(f"%{city}%"))
            
    if status:
        query = query.filter(HarvestTransaction.status == status)
        
    txns = query.order_by(desc(HarvestTransaction.harvest_date), desc(HarvestTransaction.id)).all()
    
    records = []
    for t in txns:
        records.append({
            "id": t.id,
            "transaction_ref": t.transaction_ref,
            "harvest_date": t.harvest_date,
            "vlan_id": t.vlan_id,
            "vendo_name": t.vendo.vendo_name if t.vendo else "",
            "partner_id": None,
            "partner_name": "N/A",
            "harvester_id": t.harvester_id,
            "harvester_name": t.harvester.full_name if t.harvester else "Unassigned",
            "city": t.vendo.city_municipality if t.vendo else "",
            "gross_harvest": t.gross_harvest,
            "partner_share": Decimal("0.00"),
            "staff_incentive": t.staff_incentive,
            "gartech_net": t.gartech_net,
            "status": t.status.value
        })
    return records

@router.get("/daily")
def get_daily_report(
    report_date: Optional[date] = Query(None),
    scope: str = Query("all", description="all, individual_harvester, individual_partner, group_location"),
    harvester_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    target_date = report_date or date.today()
    records = get_report_records(
        db,
        scope=scope,
        start_date=target_date,
        end_date=target_date,
        harvester_id=harvester_id,
        partner_id=partner_id,
        city=city
    )
    
    total_gross = sum((r["gross_harvest"] for r in records), Decimal("0.00"))
    total_partner = sum((r["partner_share"] for r in records), Decimal("0.00"))
    total_staff = sum((r["staff_incentive"] for r in records), Decimal("0.00"))
    total_net = sum((r["gartech_net"] for r in records), Decimal("0.00"))
    
    return {
        "report_type": "daily",
        "scope": scope,
        "report_date": target_date,
        "total_records": len(records),
        "total_gross": total_gross,
        "total_partner_share": total_partner,
        "total_staff_incentive": total_staff,
        "total_gartech_net": total_net,
        "records": records
    }

@router.get("/weekly")
def get_weekly_report(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    scope: str = Query("all", description="all, individual_harvester, individual_partner, group_location"),
    harvester_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    today = date.today()
    if not start_date or not end_date:
        start_date = today - timedelta(days=today.weekday())
        end_date = start_date + timedelta(days=6)
        
    records = get_report_records(
        db,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        harvester_id=harvester_id,
        partner_id=partner_id,
        city=city
    )
    
    total_gross = sum((r["gross_harvest"] for r in records), Decimal("0.00"))
    total_partner = sum((r["partner_share"] for r in records), Decimal("0.00"))
    total_staff = sum((r["staff_incentive"] for r in records), Decimal("0.00"))
    total_net = sum((r["gartech_net"] for r in records), Decimal("0.00"))
    unique_machines = len(set((r["vlan_id"] for r in records)))
    
    return {
        "report_type": "weekly",
        "scope": scope,
        "start_date": start_date,
        "end_date": end_date,
        "total_records": len(records),
        "machines_harvested": unique_machines,
        "total_gross": total_gross,
        "total_partner_share": total_partner,
        "total_staff_incentive": total_staff,
        "total_gartech_net": total_net,
        "records": records
    }

@router.get("/monthly")
def get_monthly_report(
    period: Optional[str] = Query(None, description="YYYY-MM"),
    scope: str = Query("all", description="all, individual_harvester, individual_partner, group_location"),
    harvester_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    target_period = period or date.today().strftime("%Y-%m")
    year, month = map(int, target_period.split("-"))
    start_date = date(year, month, 1)
    
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
        
    records = get_report_records(
        db,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        harvester_id=harvester_id,
        partner_id=partner_id,
        city=city
    )
    
    total_active_machines = db.query(VendoMachine).filter(VendoMachine.status == VendoStatus.ACTIVE).count()
    harvested_vlan_ids = set((r["vlan_id"] for r in records))
    harvested_count = len(harvested_vlan_ids)
    pending_count = max(0, total_active_machines - harvested_count)
    
    total_gross = sum((r["gross_harvest"] for r in records), Decimal("0.00"))
    total_partner = sum((r["partner_share"] for r in records), Decimal("0.00"))
    total_staff = sum((r["staff_incentive"] for r in records), Decimal("0.00"))
    total_net = sum((r["gartech_net"] for r in records), Decimal("0.00"))
    
    return {
        "report_type": "monthly",
        "scope": scope,
        "period": target_period,
        "start_date": start_date,
        "end_date": end_date,
        "total_records": len(records),
        "total_active_vendos": total_active_machines,
        "machines_harvested": harvested_count,
        "machines_pending": pending_count,
        "total_gross": total_gross,
        "total_partner_share": total_partner,
        "total_staff_incentive": total_staff,
        "total_gartech_net": total_net,
        "records": records
    }

@router.get("/custom")
def get_custom_report(
    scope: str = Query("all", description="all, individual_harvester, individual_partner, group_location"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    vlan_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    harvester_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    status: Optional[HarvestStatus] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    records = get_report_records(
        db,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        vlan_id=vlan_id,
        partner_id=partner_id,
        harvester_id=harvester_id,
        city=city,
        status=status
    )
    
    total_gross = sum((r["gross_harvest"] for r in records), Decimal("0.00"))
    total_partner = sum((r["partner_share"] for r in records), Decimal("0.00"))
    total_staff = sum((r["staff_incentive"] for r in records), Decimal("0.00"))
    total_net = sum((r["gartech_net"] for r in records), Decimal("0.00"))
    
    return {
        "report_type": "custom",
        "scope": scope,
        "filter": {
            "start_date": start_date,
            "end_date": end_date,
            "vlan_id": vlan_id,
            "partner_id": partner_id,
            "harvester_id": harvester_id,
            "city": city,
            "status": status.value if status else None
        },
        "total_records": len(records),
        "total_gross": total_gross,
        "total_partner_share": total_partner,
        "total_staff_incentive": total_staff,
        "total_gartech_net": total_net,
        "records": records
    }

@router.get("/export/excel")
def export_excel(
    report_type: str = Query("custom", description="daily, weekly, monthly, custom"),
    scope: str = Query("all", description="all, individual_harvester, individual_partner, group_location"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    period: Optional[str] = Query(None),
    harvester_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    vlan_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if period and not start_date and not end_date:
        year, month = map(int, period.split("-"))
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)
            
    records = get_report_records(
        db,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        vlan_id=vlan_id,
        partner_id=partner_id,
        harvester_id=harvester_id,
        city=city
    )
    
    scope_str = scope.replace("_", " ").title()
    title = f"{report_type.capitalize()} Harvest & Revenue Sharing Report ({scope_str})"
    subtitle = f"Period: {start_date or 'Any'} to {end_date or 'Any'}"
    
    excel_bytes = generate_harvest_excel(title, subtitle, records)
    filename = f"gartech_{report_type}_{scope}_{date.today().isoformat()}.xlsx"
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/pdf")
def export_pdf(
    report_type: str = Query("custom", description="daily, weekly, monthly, custom"),
    scope: str = Query("all", description="all, individual_harvester, individual_partner, group_location"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    period: Optional[str] = Query(None),
    harvester_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    vlan_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if period and not start_date and not end_date:
        year, month = map(int, period.split("-"))
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1) - timedelta(days=1)
        else:
            end_date = date(year, month + 1, 1) - timedelta(days=1)

    records = get_report_records(
        db,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        vlan_id=vlan_id,
        partner_id=partner_id,
        harvester_id=harvester_id,
        city=city
    )
    
    scope_str = scope.replace("_", " ").title()
    title = f"{report_type.capitalize()} Harvest & Revenue Sharing Report ({scope_str})"
    subtitle = f"Period: {start_date or 'Any'} to {end_date or 'Any'}"
    
    pdf_bytes = generate_harvest_pdf(title, subtitle, records)
    filename = f"gartech_{report_type}_{scope}_{date.today().isoformat()}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/export/csv")
def export_csv(
    report_type: str = Query("custom"),
    scope: str = Query("all"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    harvester_id: Optional[int] = Query(None),
    partner_id: Optional[int] = Query(None),
    vlan_id: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    records = get_report_records(
        db,
        scope=scope,
        start_date=start_date,
        end_date=end_date,
        vlan_id=vlan_id,
        partner_id=partner_id,
        harvester_id=harvester_id,
        city=city
    )
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Transaction Ref", "Harvest Date", "VLAN ID", "Vendo Name",
        "Partner Name", "Harvester", "City", "Gross Harvest (PHP)",
        "Partner Share (PHP)", "Staff Incentive (PHP)", "GARTECH Net (PHP)", "Status"
    ])
    
    for r in records:
        writer.writerow([
            r.get("transaction_ref", ""),
            r.get("harvest_date", ""),
            r.get("vlan_id", ""),
            r.get("vendo_name", ""),
            r.get("partner_name", ""),
            r.get("harvester_name", ""),
            r.get("city", ""),
            f"{Decimal(str(r.get('gross_harvest', 0))):.2f}",
            f"{Decimal(str(r.get('partner_share', 0))):.2f}",
            f"{Decimal(str(r.get('staff_incentive', 0))):.2f}",
            f"{Decimal(str(r.get('gartech_net', 0))):.2f}",
            r.get("status", "")
        ])
        
    output.seek(0)
    filename = f"gartech_{report_type}_{scope}_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
