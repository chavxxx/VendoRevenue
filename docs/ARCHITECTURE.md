# GARTECH VENDO – System Architecture & Technical Specifications
## Management & Revenue Sharing System for Distributed WiFi Vendo Networks

---

## 1. Executive System Overview

**GARTECH VENDO** is an enterprise-grade operational and financial management platform engineered to oversee distributed coin-operated WiFi vendo machines deployed across municipalities and barangays. Each physical machine is assigned a unique Virtual Local Area Network (VLAN) identifier. Once a month, assigned field harvesters collect physical coins from the machines, record the gross harvest, and divide the proceeds according to strict revenue-sharing formulas:

- **Location Partner Share:** 25.00% (Default)
- **Staff Harvester Incentive:** 5.00% (Default)
- **GARTECH Net Retained Revenue:** 70.00% (Default)

The system features real-time financial arithmetic using exact 2-decimal arithmetic, preventing penny drift and rounding errors.

```
                              ┌───────────────────────────────────────────────┐
                              │            MikroTik CORE Router               │
                              │           RouterOS v7 (DST-NAT)               │
                              │         Public IP: 443 / 80 HTTPS             │
                              └──────────────────────┬────────────────────────┘
                                                     │
                                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                          Proxmox VE Server (Ubuntu 24.04 LTS)                                │
│                                                                                             │
│  ┌───────────────────────── Nginx Gateway Reverse Proxy ──────────────────────────────────┐  │
│  │  - SSL / TLS 1.3 Termination (Let's Encrypt Certbot Auto-Renew)                       │  │
│  │  - Brute-force rate limiting (5 req/m on /api/v1/auth/login, 30 req/s on /api/)       │  │
│  │  - Static Asset Delivery (/uploads/signatures, /uploads/harvests)                      │  │
│  └───────────────────────┬───────────────────────────────────┬────────────────────────────┘  │
│                          │                                   │                              │
│                          ▼                                   ▼                              │
│       ┌─────────────────────────────────────┐     ┌─────────────────────────────────────┐   │
│       │      Web Frontend Container         │     │       Backend API Container         │   │
│       │      React 18 + TypeScript + Vite   │     │       Python 3.11 + FastAPI         │   │
│       │      Tailwind CSS Dashboard         │     │       Pydantic + Decimal Engine     │   │
│       └─────────────────────────────────────┘     └──────────────────┬──────────────────┘   │
│                                                                      │                      │
│                                                                      ▼                      │
│                                                   ┌─────────────────────────────────────┐   │
│                                                   │       PostgreSQL 16 Database        │   │
│                                                   │       Volume: pgdata (Persistent)   │   │
│                                                   │       Volume: backups (Daily cron)  │   │
│                                                   └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                               ▲                                      ▲
                               │                                      │
                     Web Browsers (Desktop/Tablet)             Android Harvester App (Flutter)
                     Admin / Accounting / Partner              Field Offline Sync & Signatures
```

---

## 2. Core Architectural Principles

### 2.1. Exact Decimal Financial Engine
Floating-point data types (such as `float` or `double`) introduce binary representation errors (`0.1 + 0.2 = 0.30000000000000004`). In financial ledgers dealing with thousands of transactions, this leads to accounting drift.
- **Backend Implementation:** Every calculation is executed in Python's `Decimal` type quantized to `0.01` with `ROUND_HALF_UP`.
- **Conservation Law:**
  $$\text{GARTECH NET} = \text{GROSS HARVEST} - \text{PARTNER SHARE} - \text{STAFF INCENTIVE}$$
  This strictly guarantees that:
  $$\text{PARTNER SHARE} + \text{STAFF INCENTIVE} + \text{GARTECH NET} \equiv \text{GROSS HARVEST}$$
- **Historical Percentage Freezing:** Each transaction permanently stores the exact rates applied (`partner_percentage`, `staff_percentage`, `gartech_percentage`). Adjusting future default rates never modifies historical records.

### 2.2. Zero-Trust Server Recalculation
Financial figures entered by client applications (Web or Android) are never trusted directly by the server. The client submits only the raw gross coin amount; the backend executes recalculations against validated partner and system configurations.

### 2.3. Offline-First Mobile Harvesting Protocol
Field harvesters operating in rural barangays (e.g., Mount Nebo, Guinoyoran, Tugaya) frequently experience dead cellular zones.
1. **Local Machine Caching:** The app caches assigned vendos, locations, and partner data in local storage.
2. **Offline Transaction Queuing:** When offline, harvests are assigned a UUID v4 (`client_uuid`), signed digitally by the partner, and committed to local pending storage.
3. **Idempotent Batch Sync:** When network connectivity is restored, the mobile app sends batch payloads to `/api/v1/sync/batch`. The server checks `client_uuid` to ensure idempotent commits, preventing duplicate entries.

### 2.4. Separation of Revenue Accrual vs. Cash Payouts
Generating an approved harvest record accrues a partner share and staff incentive into the general balance. However, cash payouts are tracked in a dedicated payout ledger. A partner balance remains outstanding until a verified cash, GCash, or bank voucher is recorded.

---

## 3. User Roles and Security Matrix

| Role | Vendo Management | Harvest Encoding | Approve / Reject | Void Records | Payout Ledger | System Config & Audit | Partner Data Access |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **SUPER_ADMIN** | Full (CRUD) | Full | Yes | Yes (Mandatory Reason) | Full (CRUD) | Full | All Partners |
| **ADMIN_ACCOUNTING** | View / Edit | Full | Yes | No | Full (CRUD) | View Only | All Partners |
| **STAFF_ENCODER** | View / Search | Full | No | No | View Only | No | Assigned Vendos |
| **FIELD_HARVESTER** | View Assigned | App Only | No | No | View Own | No | Assigned Vendos |
| **PARTNER** | View Own | No | No | No | View Own | No | **Strictly Isolated (Own Only)** |

---

## 4. End-to-End Operational Lifecycle

1. **Machine Commissioning:** Super Admin registers machine with unique VLAN ID (e.g., `VLAN 101`), partner assignment (`PRT-001`), and address.
2. **Monthly Field Harvest:** Harvester physically counts coins, enters gross amount (e.g., ₱10,000.00), displays automated ₱2,500.00 / ₱500.00 / ₱7,000.00 breakdown to location partner, and captures digital signature.
3. **Submission & Verification:** Encoded record is logged as `SUBMITTED` with reference `TXN-YYYYMMDD-XXXX`.
4. **Accounting Approval:** Accounting reviews attachments, meter readings, and approves transaction (`APPROVED`).
5. **Payout Disbursement:** Accounting issues partner share via GCash/bank transfer, logs payout reference `PAY-PRT-YYYYMMDD-XXXX`, and prints voucher.
