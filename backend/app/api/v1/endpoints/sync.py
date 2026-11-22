import os
import uuid
import base64
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from decimal import Decimal

from app.core.database import get_db
from app.core.config import settings
from app.core.dependencies import get_current_user, require_roles
from app.models import (
    User, UserRole, VendoMachine, HarvestTransaction, 
    HarvestStatus, DeviceRegistration
)
from app.schemas import (
    OfflineSyncBatchRequest, OfflineSyncBatchResponse, SyncResultItem
)
from app.services.calculation import compute_revenue_distribution, to_decimal
from app.services.audit_service import log_action
from app.api.v1.endpoints.harvests import get_active_revenue_config, generate_transaction_ref

router = APIRouter()

@router.post("/batch", response_model=OfflineSyncBatchResponse)
def sync_offline_harvests(
    payload: OfflineSyncBatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([
        UserRole.SUPER_ADMIN, 
        UserRole.ADMIN_ACCOUNTING, 
        UserRole.STAFF_ENCODER, 
        UserRole.FIELD_HARVESTER
    ]))
):
    # Update device last sync timestamp
    device = db.query(DeviceRegistration).filter(DeviceRegistration.device_id == payload.device_id).first()
    if device:
        device.last_sync_at = datetime.now(timezone.utc)
    else:
        new_device = DeviceRegistration(
            user_id=current_user.id,
            device_id=payload.device_id,
            device_name=payload.device_name,
            last_sync_at=datetime.now(timezone.utc),
            is_active=True
        )
        db.add(new_device)
    db.commit()

    results: List[SyncResultItem] = []
    success_count = 0
    fail_count = 0
    
    p_pct_default, s_pct_default, g_pct_default = get_active_revenue_config(db)
    
    for item in payload.items:
        # Check idempotency: if client_uuid already recorded
        existing_by_uuid = db.query(HarvestTransaction).filter(HarvestTransaction.client_uuid == item.client_uuid).first()
        if existing_by_uuid:
            results.append(SyncResultItem(
                client_uuid=item.client_uuid,
                status="DUPLICATE",
                transaction_ref=existing_by_uuid.transaction_ref,
                error_message=f"Already synchronized as {existing_by_uuid.transaction_ref}"
            ))
            continue
            
        # Verify machine exists
        vendo = db.query(VendoMachine).filter(VendoMachine.vlan_id == item.vlan_id).first()
        if not vendo:
            fail_count += 1
            results.append(SyncResultItem(
                client_uuid=item.client_uuid,
                status="ERROR",
                error_message=f"VLAN ID {item.vlan_id} does not exist"
            ))
            continue
            
        harvest_period = item.harvest_date.strftime("%Y-%m")
        # Check duplicate for period
        existing_period = (
            db.query(HarvestTransaction)
            .filter(
                HarvestTransaction.vlan_id == item.vlan_id,
                HarvestTransaction.harvest_period == harvest_period,
                HarvestTransaction.status.in_([HarvestStatus.SUBMITTED, HarvestStatus.APPROVED])
            )
            .first()
        )
        if existing_period:
            fail_count += 1
            results.append(SyncResultItem(
                client_uuid=item.client_uuid,
                status="DUPLICATE",
                transaction_ref=existing_period.transaction_ref,
                error_message=f"A harvest is already recorded for VLAN {item.vlan_id} in {harvest_period}"
            ))
            continue
            
        try:
            p_pct = p_pct_default
            s_pct = s_pct_default
            if vendo.partner and vendo.partner.default_share_percentage:
                p_pct = to_decimal(vendo.partner.default_share_percentage)
            g_pct = Decimal("100.00") - p_pct - s_pct
            
            # Recalculate decimals strictly
            dist = compute_revenue_distribution(item.gross_harvest, p_pct, s_pct, g_pct)
            
            # Save signature if present
            sig_path = None
            if item.partner_signature_base64:
                try:
                    os.makedirs(os.path.join(settings.UPLOAD_DIR, "signatures"), exist_ok=True)
                    sig_filename = f"sig_{item.vlan_id}_{uuid.uuid4().hex[:8]}.png"
                    full_sig_path = os.path.join(settings.UPLOAD_DIR, "signatures", sig_filename)
                    raw_b64 = item.partner_signature_base64
                    if "," in raw_b64:
                        raw_b64 = raw_b64.split(",", 1)[1]
                    with open(full_sig_path, "wb") as f:
                        f.write(base64.b64decode(raw_b64))
                    sig_path = f"/uploads/signatures/{sig_filename}"
                except Exception:
                    pass
                    
            txn_ref = generate_transaction_ref(db, item.harvest_date)
            harvester_id = current_user.staff_id or vendo.assigned_harvester_id
            
            harvest = HarvestTransaction(
                transaction_ref=txn_ref,
                vendo_id=vendo.id,
                vlan_id=vendo.vlan_id,
                partner_id=vendo.partner_id,
                harvester_id=harvester_id,
                encoded_by_user_id=current_user.id,
                harvest_date=item.harvest_date,
                harvest_period=harvest_period,
                gross_harvest=dist["gross_harvest"],
                partner_percentage=dist["partner_percentage"],
                partner_share=dist["partner_share"],
                staff_percentage=dist["staff_percentage"],
                staff_incentive=dist["staff_incentive"],
                gartech_percentage=dist["gartech_percentage"],
                gartech_net=dist["gartech_net"],
                status=HarvestStatus.SUBMITTED,
                partner_confirmed=item.partner_confirmed,
                partner_signature_path=sig_path,
                remarks=item.remarks,
                client_uuid=item.client_uuid,
                is_offline_sync=True
            )
            db.add(harvest)
            db.commit()
            db.refresh(harvest)
            
            success_count += 1
            results.append(SyncResultItem(
                client_uuid=item.client_uuid,
                status="SUCCESS",
                transaction_ref=harvest.transaction_ref
            ))
            
            log_action(
                db,
                action="SYNC_OFFLINE_HARVEST",
                entity_type="HARVEST",
                entity_id=harvest.transaction_ref,
                user_id=current_user.id,
                new_values={
                    "vlan_id": harvest.vlan_id,
                    "device": payload.device_name,
                    "gross": str(harvest.gross_harvest)
                }
            )
        except Exception as e:
            fail_count += 1
            results.append(SyncResultItem(
                client_uuid=item.client_uuid,
                status="ERROR",
                error_message=str(e)
            ))
            
    return OfflineSyncBatchResponse(
        total_submitted=len(payload.items),
        successful_count=success_count,
        failed_count=fail_count,
        results=results
    )
