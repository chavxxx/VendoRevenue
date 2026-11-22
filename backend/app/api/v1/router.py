from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, vendos, staff, 
    harvests, dashboard, reports, 
    users, audit
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(vendos.router, prefix="/vendos", tags=["Vendo Management"])
api_router.include_router(staff.router, prefix="/staff", tags=["Staff Management"])
api_router.include_router(harvests.router, prefix="/harvests", tags=["Harvest Encoding"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard & Analytics"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports & Exports"])
api_router.include_router(users.router, prefix="/users", tags=["User & Config Management"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
