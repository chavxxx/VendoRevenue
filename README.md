# GARTECH VENDO – Management & Revenue Sharing System
### Complete Production-Ready WiFi Vendo Fleet & Revenue Management Platform

---

## ⚡ 1-Liner Terminal Installer (Production)

To install the entire platform on a clean **Ubuntu 20.04/22.04/24.04**, **Debian 11/12**, or **Proxmox VM/LXC**, run this single command in your terminal as `root` (or with `sudo`):

```bash
curl -fsSL https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/install.sh | sudo bash
```

*Or via wget:*
```bash
wget -qO- https://raw.githubusercontent.com/chavxxx/VendoRevenue/main/scripts/install.sh | sudo bash
```

### What this 1-liner automatically does:
1. Installs all required OS packages (`curl`, `wget`, `git`, `gnupg`, `ufw`, `openssl`, `jq`, `net-tools`, `cron`).
2. Installs the official **Docker Engine CE** and **Docker Compose Plugin**.
3. Clones the repository to `/opt/gartech`.
4. Auto-generates cryptographically secure production secrets in `.env`.
5. Prepares persistent storage directories for uploads and automated daily database backups.
6. Opens necessary firewall ports (`80/HTTP`, `443/HTTPS`, `22/SSH`).
7. Builds and boots the multi-container stack (**PostgreSQL 16**, **FastAPI Backend**, **React 18 Frontend**, **Nginx Gateway**).
8. Performs automated healthcheck verification and configures daily database backup cron jobs at 2:00 AM.

---

## 🌟 Executive Summary

**GARTECH VENDO** is a comprehensive, production-ready operational and financial management application built to manage hundreds of WiFi vendo machines distributed across various locations. Each machine generates coin revenue that is harvested once a month by assigned field personnel, divided between GARTECH (70%), the location partner (25%), and the staff member performing the harvesting (5%).

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Key Highlights |
| :--- | :--- | :--- |
| **Backend API** | Python 3.11 / 3.14 + FastAPI | Decimal-based arithmetic (`0.01` half-up), JWT RBAC, OpenAPI/Swagger docs |
| **Database** | PostgreSQL 16 + SQLAlchemy | 14 Normalized relational tables, foreign keys, unique constraints, audit trail |
| **Web Frontend** | React 18 + TypeScript + Vite | Tailwind CSS, Recharts, dark navy/white styling, multi-role portal |
| **Mobile App** | Flutter 3.47 + Dart | Native Android APK, offline caching, digital signature pad, batch sync |
| **Infrastructure** | Docker Compose + Nginx | SSL / TLS 1.3 via Let's Encrypt, rate-limiting, Proxmox VE & MikroTik ready |

---

## 🔐 Default Production Credentials (Seeded)

| Role | Username | Password | Access Capabilities |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `GartechAdmin2026!` | Full system access, percentages config, void transactions, audit logs |
| **Accounting** | `accounting` | `GartechAcct2026!` | Review harvests, approve/reject, record partner/staff payouts, reports |
| **Staff Encoder**| `encoder1` | `GartechEncoder2026!` | Monthly harvest encoding, VLAN search, live revenue calculation preview |
| **Field Harvester**| `harvester1` | `GartechHarvester2026!` | Android App login, offline harvest recording, partner signatures |
| **Location Partner**| `partner_juan` | `PartnerPass2026!` | Dedicated Partner Portal: view assigned machines, 25% share, PDF statements |

---

## 🚀 Quick Start Guide

### 1. Running the Central Backend & Web Portal (Local Dev)

#### Backend:
```bash
cd backend
source venv/bin/activate
export PYTHONPATH=.
python -m app.db.init_db     # Seeds database with test accounts, 20 vendos, and 3 months history
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

#### Web Frontend:
```bash
cd frontend
npm install
npm run dev
```
- Web Portal: `http://localhost:5173`

#### Automated Backend Test Suite:
```bash
cd backend
source venv/bin/activate
PYTHONPATH=. pytest -v tests/
```

---

### 2. Android Harvester Application

The Android app is located in `mobile/gartech_vendo_harvester`:
```bash
cd mobile/gartech_vendo_harvester
flutter analyze   # 0 issues
flutter test      # All tests pass
flutter build apk --debug
```
- Generated APK: `mobile/gartech_vendo_harvester/build/app/outputs/flutter-apk/app-debug.apk` (155 MB)
- Supports offline harvesting, digital signatures, and automatic synchronization when internet reconnects.

---

### 3. Production Deployment on Proxmox VE

```bash
# On your Ubuntu Server VM in Proxmox:
sudo ./scripts/install.sh
```
This automatically configures Docker, firewall, daily database backups, and starts the container stack (`postgres`, `backend`, `frontend`, `nginx`, `certbot`).

See [docs/PROXMOX_DEPLOYMENT.md](file:///Users/chavxxx/Documents/GARTECH/docs/PROXMOX_DEPLOYMENT.md) for full instructions.

---

### 4. MikroTik RouterOS v7 Port Forwarding (DST-NAT)

Forward public HTTPS port 443 and HTTP port 80 to your Proxmox server IP:
```routeros
/ip firewall nat add chain=dstnat in-interface-list=WAN protocol=tcp dst-port=443 action=dst-nat to-addresses=192.168.88.200 to-ports=443 comment="GARTECH HTTPS"
/ip firewall nat add chain=dstnat in-interface-list=WAN protocol=tcp dst-port=80 action=dst-nat to-addresses=192.168.88.200 to-ports=80 comment="GARTECH HTTP/Certbot"
```
See [docs/MIKROTIK_FIREWALL_GUIDE.md](file:///Users/chavxxx/Documents/GARTECH/docs/MIKROTIK_FIREWALL_GUIDE.md) for Hairpin NAT and DDoS mitigation rules.

---

## 📁 Repository Structure

```
GARTECH/
├── backend/                   # FastAPI Python backend application
│   ├── app/
│   │   ├── api/v1/endpoints/  # Auth, Vendos, Partners, Staff, Harvests, Payouts, Dashboard, Reports, Sync
│   │   ├── core/              # Config, Security (bcrypt/JWT), Database, Dependencies
│   │   ├── models/            # SQLAlchemy normalized relational models
│   │   ├── schemas/           # Pydantic request/response schemas
│   │   ├── services/          # Decimal calculation engine, PDF/Excel generators, Audit
│   │   ├── db/init_db.py      # Production database seeder
│   │   └── main.py            # FastAPI entry point
│   ├── tests/                 # Automated test suite (Pytest)
│   ├── requirements.txt       # Python dependencies
│   └── Dockerfile             # Multi-stage production container
├── frontend/                  # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar, modals
│   │   ├── pages/             # Dashboard, Vendos, Harvest Encoding, Harvest Records, Partners, Staff, Payouts, Reports, Partner Portal, Settings
│   │   ├── services/api.ts    # Centralized REST API client
│   │   └── context/           # AuthContext (RBAC state)
│   ├── package.json
│   └── Dockerfile
├── mobile/                    # Flutter Android Field Harvester App
│   └── gartech_vendo_harvester/
│       ├── lib/               # Models, OfflineStorage, ApiService, SignaturePad, Screens
│       └── build/app/outputs/flutter-apk/app-debug.apk # Compiled native APK
├── docker/                    # Multi-container orchestration
│   ├── docker-compose.yml     # PostgreSQL, Backend, Frontend, Nginx, Certbot
│   └── nginx/                 # Nginx gateway & SSL configuration
├── scripts/                   # Operational automation
│   ├── backup_db.sh           # Automated PostgreSQL backup with 30-day retention
│   ├── restore_db.sh          # Database restore script
│   ├── install.sh             # 1-command installer for Ubuntu Server / Proxmox
│   └── update.sh              # Zero-downtime application updater
└── docs/                      # Engineering documentation
    ├── ARCHITECTURE.md        # Technical architecture & financial specifications
    ├── DATABASE_SCHEMA.md     # Relational schema dictionary
    ├── API_DOCUMENTATION.md   # Complete OpenAPI REST endpoint reference
    ├── PROXMOX_DEPLOYMENT.md  # Proxmox VE 8.x installation guide
    └── MIKROTIK_FIREWALL_GUIDE.md # MikroTik RouterOS v7 NAT & firewall guide
```
