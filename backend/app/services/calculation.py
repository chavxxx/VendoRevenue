from decimal import Decimal, ROUND_HALF_UP
from typing import Tuple, Dict, Any, Optional

CENT = Decimal("0.01")
ONE_HUNDRED = Decimal("100.00")

def to_decimal(val: Any) -> Decimal:
    """Safely converts string, int, float, or Decimal to Decimal with 2 decimal places."""
    if isinstance(val, Decimal):
        return val.quantize(CENT, rounding=ROUND_HALF_UP)
    return Decimal(str(val)).quantize(CENT, rounding=ROUND_HALF_UP)

def compute_revenue_distribution(
    gross_harvest: Any,
    partner_percentage: Any = Decimal("25.00"),
    staff_percentage: Any = None,
    gartech_percentage: Any = None,
    staff_incentive_percentage: Any = None,
    gartech_net_percentage: Any = None
) -> Dict[str, Decimal]:
    """
    Computes exact revenue distribution using strict Decimal arithmetic.
    
    Formula:
      - GROSS HARVEST: Total coins collected
      - PARTNER SHARE: GROSS HARVEST * (partner_percentage / 100)
      - STAFF INCENTIVE: GROSS HARVEST * (staff_percentage / 100)
      - GARTECH NET: GROSS HARVEST - PARTNER SHARE - STAFF INCENTIVE
      
    This guarantees that PARTNER SHARE + STAFF INCENTIVE + GARTECH NET is always
    exactly equal to GROSS HARVEST, without any penny drift.
    """
    gross = to_decimal(gross_harvest)
    p_pct = to_decimal(partner_percentage)
    
    s_val = staff_percentage if staff_percentage is not None else (staff_incentive_percentage if staff_incentive_percentage is not None else Decimal("5.00"))
    s_pct = to_decimal(s_val)
    
    g_val = gartech_percentage if gartech_percentage is not None else (gartech_net_percentage if gartech_net_percentage is not None else Decimal("70.00"))
    g_pct = to_decimal(g_val)

    if gross < Decimal("0.00"):
        raise ValueError("Gross harvest cannot be negative.")
        
    total_pct = p_pct + s_pct + g_pct
    if total_pct != ONE_HUNDRED:
        raise ValueError(f"Total percentages must equal 100.00%. Current sum: {total_pct}%")

    partner_share = (gross * p_pct / ONE_HUNDRED).quantize(CENT, rounding=ROUND_HALF_UP)
    staff_incentive = (gross * s_pct / ONE_HUNDRED).quantize(CENT, rounding=ROUND_HALF_UP)
    
    # GARTECH net is balancing remainder so sum is strictly conserved
    gartech_net = (gross - partner_share - staff_incentive).quantize(CENT, rounding=ROUND_HALF_UP)

    return {
        "gross_harvest": gross,
        "partner_percentage": p_pct,
        "partner_share": partner_share,
        "staff_percentage": s_pct,
        "staff_incentive": staff_incentive,
        "gartech_percentage": g_pct,
        "gartech_net": gartech_net
    }
