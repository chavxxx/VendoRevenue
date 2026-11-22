from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, VendoMachine, Partner, Staff, 
    HarvestTransaction, HarvestStatus, VendoStatus
)
from app.schemas import (
    DashboardSummary, ChartDataPoint, TopEntityItem, LocationPerformanceItem,
    HarvesterPerformanceItem, HarvesterDetailResponse, HarvestResponse
)

router = APIRouter()

def get_date_bounds(period: str, custom_start: Optional[date] = None, custom_end: Optional[date] = None):
    today = date.today()
    if period == "today":
        return today, today
    elif period == "yesterday":
        yest = today - timedelta(days=1)
        return yest, yest
    elif period == "this_week":
        start = today - timedelta(days=today.weekday())
        return start, today
    elif period == "last_week":
        start = today - timedelta(days=today.weekday() + 7)
        end = start + timedelta(days=6)
        return start, end
    elif period == "this_month":
        start = date(today.year, today.month, 1)
        return start, today
    elif period == "last_month":
        first_this = date(today.year, today.month, 1)
        last_prev = first_this - timedelta(days=1)
        start = date(last_prev.year, last_prev.month, 1)
        return start, last_prev
    elif period == "this_year":
        start = date(today.year, 1, 1)
        return start, today
    elif period == "custom" and custom_start and custom_end:
        return custom_start, custom_end
    # Default to this month
    return date(today.year, today.month, 1), today

@router.get("/summary", response_model=DashboardSummary)
def get_dashboard_summary(
    period: str = Query("this_month", description="today, yesterday, this_week, last_week, this_month, last_month, this_year, all_time, custom"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    municipality: Optional[str] = Query(None, description="Filter by municipality/city"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    vendo_query = db.query(VendoMachine)
    if municipality:
        vendo_query = vendo_query.filter(VendoMachine.city_municipality == municipality)

    total_vendos = vendo_query.count()
    active_vendos = vendo_query.filter(VendoMachine.status == VendoStatus.ACTIVE).count()
    inactive_vendos = total_vendos - active_vendos
    total_partners = 0
    
    txn_query = db.query(
        func.coalesce(func.sum(HarvestTransaction.gross_harvest), Decimal("0.00")).label("gross"),
        func.coalesce(func.sum(HarvestTransaction.staff_incentive), Decimal("0.00")).label("staff_incentive"),
        func.coalesce(func.sum(HarvestTransaction.gartech_net), Decimal("0.00")).label("gartech_net")
    ).filter(HarvestTransaction.status == HarvestStatus.APPROVED)
    
    if municipality:
        txn_query = txn_query.join(VendoMachine, HarvestTransaction.vendo_id == VendoMachine.id)\
                             .filter(VendoMachine.city_municipality == municipality)

    if period != "all_time":
        d_start, d_end = get_date_bounds(period, start_date, end_date)
        txn_query = txn_query.filter(
            HarvestTransaction.harvest_date >= d_start,
            HarvestTransaction.harvest_date <= d_end
        )
        
    financials = txn_query.first()
    
    return DashboardSummary(
        total_vendos=total_vendos,
        active_vendos=active_vendos,
        inactive_vendos=inactive_vendos,
        total_partners=0,
        total_gross_harvest=financials.gross or Decimal("0.00"),
        total_partner_shares=Decimal("0.00"),
        total_staff_incentives=financials.staff_incentive or Decimal("0.00"),
        total_gartech_net=financials.gartech_net or Decimal("0.00")
    )

@router.get("/charts/daily", response_model=List[ChartDataPoint])
def get_daily_harvest_chart(
    days: int = Query(14, ge=7, le=60),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    start_date = date.today() - timedelta(days=days - 1)
    results = (
        db.query(
            HarvestTransaction.harvest_date,
            func.coalesce(func.sum(HarvestTransaction.gross_harvest), Decimal("0.00")).label("gross"),
            func.coalesce(func.sum(HarvestTransaction.gartech_net), Decimal("0.00")).label("net")
        )
        .filter(
            HarvestTransaction.status == HarvestStatus.APPROVED,
            HarvestTransaction.harvest_date >= start_date
        )
        .group_by(HarvestTransaction.harvest_date)
        .order_by(HarvestTransaction.harvest_date.asc())
        .all()
    )
    
    data_map = {r.harvest_date.strftime("%b %d"): (r.gross, r.net) for r in results}
    chart = []
    for i in range(days):
        d = start_date + timedelta(days=i)
        lbl = d.strftime("%b %d")
        gross, net = data_map.get(lbl, (Decimal("0.00"), Decimal("0.00")))
        chart.append(ChartDataPoint(label=lbl, value=gross, secondary_value=net))
    return chart

@router.get("/charts/monthly", response_model=List[ChartDataPoint])
def get_monthly_harvest_chart(
    months: int = Query(6, ge=3, le=24),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    results = (
        db.query(
            HarvestTransaction.harvest_period,
            func.coalesce(func.sum(HarvestTransaction.gross_harvest), Decimal("0.00")).label("gross"),
            func.coalesce(func.sum(HarvestTransaction.gartech_net), Decimal("0.00")).label("net")
        )
        .filter(HarvestTransaction.status == HarvestStatus.APPROVED)
        .group_by(HarvestTransaction.harvest_period)
        .order_by(HarvestTransaction.harvest_period.desc())
        .limit(months)
        .all()
    )
    
    results.reverse()
    return [
        ChartDataPoint(
            label=r.harvest_period,
            value=r.gross,
            secondary_value=r.net
        ) for r in results
    ]

@router.get("/charts/top-vendos", response_model=List[TopEntityItem])
def get_top_vendos(
    limit: int = Query(10, ge=5, le=20),
    municipality: Optional[str] = Query(None, description="Filter by municipality/city"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    query = (
        db.query(
            VendoMachine.id,
            VendoMachine.vlan_id,
            VendoMachine.vendo_name,
            func.coalesce(func.sum(HarvestTransaction.gross_harvest), Decimal("0.00")).label("total_rev"),
            func.count(HarvestTransaction.id).label("txn_count")
        )
        .join(HarvestTransaction, VendoMachine.id == HarvestTransaction.vendo_id)
        .filter(HarvestTransaction.status == HarvestStatus.APPROVED)
    )
    if municipality:
        query = query.filter(VendoMachine.city_municipality == municipality)

    results = (
        query.group_by(VendoMachine.id, VendoMachine.vlan_id, VendoMachine.vendo_name)
        .order_by(desc("total_rev"))
        .limit(limit)
        .all()
    )
    
    return [
        TopEntityItem(
            id=r.id,
            name=f"VLAN {r.vlan_id} - {r.vendo_name}",
            subtitle=f"{r.txn_count} harvests recorded",
            total_revenue=r.total_rev,
            count=r.txn_count
        ) for r in results
    ]

@router.get("/charts/top-partners", response_model=List[TopEntityItem])
def get_top_partners(
    limit: int = Query(10, ge=5, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    # Partners removed; returns empty list
    return []

@router.get("/charts/locations", response_model=List[LocationPerformanceItem])
def get_location_performance(
    sort_by: str = Query("revenue_desc", description="revenue_desc, revenue_asc, name_asc, name_desc, vendos_desc"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    query = (
        db.query(
            VendoMachine.city_municipality,
            func.count(func.distinct(VendoMachine.id)).label("v_count"),
            func.coalesce(func.sum(HarvestTransaction.gross_harvest), Decimal("0.00")).label("total_gross")
        )
        .outerjoin(HarvestTransaction, and_(
            VendoMachine.id == HarvestTransaction.vendo_id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        ))
        .group_by(VendoMachine.city_municipality)
    )

    if sort_by == "revenue_asc":
        query = query.order_by(HarvestTransaction.gross_harvest.asc())
    elif sort_by == "name_asc":
        query = query.order_by(VendoMachine.city_municipality.asc())
    elif sort_by == "name_desc":
        query = query.order_by(VendoMachine.city_municipality.desc())
    elif sort_by == "vendos_desc":
        query = query.order_by(desc("v_count"))
    else: # revenue_desc
        query = query.order_by(desc("total_gross"))

    results = query.all()
    
    return [
        LocationPerformanceItem(
            location=r.city_municipality,
            vendo_count=r.v_count,
            total_gross=r.total_gross
        ) for r in results
    ]

@router.get("/municipalities", response_model=List[str])
def get_all_municipalities(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    """Return distinct list of municipalities where vendos are deployed."""
    cities = (
        db.query(VendoMachine.city_municipality)
        .filter(VendoMachine.city_municipality.isnot(None))
        .distinct()
        .order_by(VendoMachine.city_municipality.asc())
        .all()
    )
    return [c[0] for c in cities if c[0]]

# --- REQUIREMENTS 1 & 2: HARVESTER PERFORMANCE VIEWS ---

@router.get("/harvesters", response_model=List[HarvesterPerformanceItem])
def get_all_harvesters_performance(
    period: str = Query("this_month", description="today, yesterday, this_week, last_week, this_month, last_month, this_year, all_time, custom"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    """
    Requirement 2: View ALL harvesters with performance breakdown
    (Daily, Weekly, Monthly, or Custom Range).
    """
    harvesters = db.query(Staff).filter(Staff.is_active == True).all()
    
    d_start = None
    d_end = None
    if period != "all_time":
        d_start, d_end = get_date_bounds(period, start_date, end_date)
        
    results = []
    for h in harvesters:
        # Assigned vendos
        assigned_count = db.query(VendoMachine).filter(VendoMachine.assigned_harvester_id == h.id).count()
        
        # Harvests query for this harvester in this period
        h_query = db.query(
            func.count(HarvestTransaction.id).label("count"),
            func.coalesce(func.sum(HarvestTransaction.gross_harvest), Decimal("0.00")).label("total_gross"),
            func.coalesce(func.sum(HarvestTransaction.staff_incentive), Decimal("0.00")).label("total_incentive"),
            func.max(HarvestTransaction.harvest_date).label("latest_date")
        ).filter(
            HarvestTransaction.harvester_id == h.id,
            HarvestTransaction.status == HarvestStatus.APPROVED
        )
        
        if d_start and d_end:
            h_query = h_query.filter(
                HarvestTransaction.harvest_date >= d_start,
                HarvestTransaction.harvest_date <= d_end
            )
            
        stats = h_query.first()
        
        results.append(
            HarvesterPerformanceItem(
                staff_id=h.id,
                staff_code=h.staff_code,
                staff_name=h.full_name,
                phone=h.phone,
                email=h.email,
                assigned_vendos_count=assigned_count,
                harvests_count=stats.count or 0,
                total_gross_harvest=stats.total_gross or Decimal("0.00"),
                total_incentive=stats.total_incentive or Decimal("0.00"),
                latest_harvest_date=stats.latest_date
            )
        )
        
    # Sort by highest gross harvest descending
    results.sort(key=lambda x: x.total_gross_harvest, reverse=True)
    return results

@router.get("/harvesters/{staff_id}", response_model=HarvesterDetailResponse)
def get_harvester_detail_performance(
    staff_id: int,
    period: str = Query("this_month", description="today, yesterday, this_week, last_week, this_month, last_month, this_year, all_time, custom"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.ADMIN, UserRole.STAFF_ENCODER]))
):
    """
    Requirement 1: View PER HARVESTER details with daily, weekly, monthly,
    plus custom range filtering and daily activity timeline.
    """
    harvester = db.query(Staff).filter(Staff.id == staff_id).first()
    if not harvester:
        raise HTTPException(status_code=404, detail="Harvester staff member not found")
        
    assigned_count = db.query(VendoMachine).filter(VendoMachine.assigned_harvester_id == harvester.id).count()
    
    d_start = None
    d_end = None
    if period != "all_time":
        d_start, d_end = get_date_bounds(period, start_date, end_date)
        
    h_query = db.query(HarvestTransaction).filter(
        HarvestTransaction.harvester_id == harvester.id,
        HarvestTransaction.status == HarvestStatus.APPROVED
    )
    if d_start and d_end:
        h_query = h_query.filter(
            HarvestTransaction.harvest_date >= d_start,
            HarvestTransaction.harvest_date <= d_end
        )
        
    txns = h_query.order_by(desc(HarvestTransaction.harvest_date), desc(HarvestTransaction.id)).all()
    
    total_gross = sum((t.gross_harvest for t in txns), Decimal("0.00"))
    total_incentive = sum((t.staff_incentive for t in txns), Decimal("0.00"))
    
    # Generate daily trend aggregations
    daily_map = {}
    for t in txns:
        lbl = t.harvest_date.strftime("%Y-%m-%d")
        if lbl not in daily_map:
            daily_map[lbl] = {"gross": Decimal("0.00"), "incentive": Decimal("0.00")}
        daily_map[lbl]["gross"] += t.gross_harvest
        daily_map[lbl]["incentive"] += t.staff_incentive
        
    daily_trends = [
        ChartDataPoint(
            label=k,
            value=v["gross"],
            secondary_value=v["incentive"]
        ) for k, v in sorted(daily_map.items())
    ]
    
    harvest_responses = [
        HarvestResponse(
            id=t.id,
            transaction_ref=t.transaction_ref,
            vendo_id=t.vendo_id,
            vlan_id=t.vlan_id,
            vendo_name=t.vendo.vendo_name if t.vendo else None,
            partner_id=t.partner_id,
            partner_name=t.partner.name if t.partner else None,
            harvester_id=t.harvester_id,
            harvester_name=harvester.full_name,
            encoded_by_user_id=t.encoded_by_user_id,
            encoded_by_name=t.encoded_by.full_name if t.encoded_by else None,
            harvest_date=t.harvest_date,
            harvest_period=t.harvest_period,
            gross_harvest=t.gross_harvest,
            partner_percentage=t.partner_percentage,
            partner_share=t.partner_share,
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
        ) for t in txns
    ]
    
    return HarvesterDetailResponse(
        staff_id=harvester.id,
        staff_code=harvester.staff_code,
        staff_name=harvester.full_name,
        phone=harvester.phone,
        email=harvester.email,
        assigned_vendos_count=assigned_count,
        harvests_count=len(txns),
        total_gross_harvest=total_gross,
        total_incentive=total_incentive,
        harvests=harvest_responses,
        daily_trends=daily_trends
    )
