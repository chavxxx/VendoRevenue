# GARTECH VENDO – REST API Reference Manual
## Version 1.0.0 | REST Architecture | JSON Payloads | Bearer Token Auth

Interactive OpenAPI Documentation is available at:
- Swagger UI: `http://localhost:8000/docs` or `https://[DOMAIN]/docs`
- ReDoc: `http://localhost:8000/redoc`

All financial amounts are strictly calculated using 2-decimal exact arithmetic.

---

## 1. Authentication & Session (`/api/v1/auth`)

### `POST /api/v1/auth/login`
Authenticates a user and issues a signed JWT token with role claims.

**Request Body:**
```json
{
  "username": "admin",
  "password": "GartechAdmin2026!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@gartech.ph",
    "full_name": "GARTECH Super Administrator",
    "role": "SUPER_ADMIN",
    "is_active": true,
    "created_at": "2026-11-22T06:11:53"
  }
}
```

### `GET /api/v1/auth/me`
Retrieves current authenticated profile. Header: `Authorization: Bearer <TOKEN>`.

### `POST /api/v1/auth/device-register`
Registers an Android mobile device with FCM token for field harvesters.

---

## 2. Vendo Machine Management (`/api/v1/vendos`)

### `GET /api/v1/vendos/`
Lists vendo machines with search and multi-column filtering.
- **Query Parameters:** `search`, `partner_id`, `status`, `city`, `assigned_harvester_id`, `sort_by`, `sort_order`, `skip`, `limit`

**Sample Item in Array:**
```json
{
  "id": 1,
  "vlan_id": 101,
  "vendo_name": "WiFi Vendo - Purok 1 Central",
  "partner_id": 1,
  "partner_name": "Juan Dela Cruz",
  "complete_address": "Purok 1, Valencia, Bukidnon",
  "city_municipality": "Valencia",
  "province": "Bukidnon",
  "harvester_name": "Carlo Mendoza",
  "installation_date": "2025-01-15",
  "status": "ACTIVE",
  "last_harvest_date": "2026-11-20",
  "last_gross_harvest": 12500.00,
  "last_partner_share": 3125.00
}
```

### `GET /api/v1/vendos/{vlan_id}`
Looks up single machine by its primary operational VLAN ID.

### `POST /api/v1/vendos/`
Creates a new vendo machine (Requires `SUPER_ADMIN` or `ADMIN_ACCOUNTING`).

### `POST /api/v1/vendos/import/csv`
Uploads a bulk CSV file containing hundreds of vendo records.

### `GET /api/v1/vendos/export/csv`
Downloads full active inventory in CSV format.

---

## 3. Harvest Encoding & Ledger (`/api/v1/harvests`)

### `POST /api/v1/harvests/preview`
Instant calculation preview before saving.
**Request Body:**
```json
{
  "gross_harvest": 10000.00,
  "partner_percentage": 25.00,
  "staff_percentage": 5.00
}
```
**Response (200 OK):**
```json
{
  "gross_harvest": 10000.00,
  "partner_percentage": 25.00,
  "partner_share": 2500.00,
  "staff_percentage": 5.00,
  "staff_incentive": 500.00,
  "gartech_percentage": 70.00,
  "gartech_net": 7000.00
}
```

### `POST /api/v1/harvests/`
Submits a monthly coin harvest transaction.
- Prevents duplicate harvest entry for same VLAN and period (`YYYY-MM`).
- Freezes transaction rates.
- Automatically generates unique reference `TXN-YYYYMMDD-XXXX`.

**Request Body:**
```json
{
  "vlan_id": 101,
  "harvest_date": "2026-11-22",
  "gross_harvest": 10000.00,
  "partner_confirmed": true,
  "partner_signature_base64": "data:image/png;base64,iVBOR...",
  "remarks": "Collected with partner present"
}
```

### `POST /api/v1/harvests/{id}/approve`
Approves submitted harvest transaction (`ADMIN_ACCOUNTING` / `SUPER_ADMIN`).

### `POST /api/v1/harvests/{id}/reject`
Rejects transaction with required explanation.

### `POST /api/v1/harvests/{id}/void`
Voids approved transaction. **Approved records are never deleted.** Requires mandatory void reason.

---

## 4. Mobile Offline Synchronization (`/api/v1/sync`)

### `POST /api/v1/sync/batch`
Accepts a batch of offline harvested transactions from Android devices.
- Recalculates decimals server-side.
- Enforces idempotency via `client_uuid`.
- Returns individual transaction statuses.

**Request Body:**
```json
{
  "device_id": "android_harvester_mobile",
  "device_name": "Xiaomi Redmi Note 12",
  "items": [
    {
      "client_uuid": "c92e9216-4176-466e-9be7-7204f128bc1d",
      "vlan_id": 101,
      "harvest_date": "2026-11-22",
      "gross_harvest": 10000.00,
      "partner_confirmed": true,
      "partner_signature_base64": "data:image/png;base64,..."
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "total_submitted": 1,
  "successful_count": 1,
  "failed_count": 0,
  "results": [
    {
      "client_uuid": "c92e9216-4176-466e-9be7-7204f128bc1d",
      "status": "SUCCESS",
      "transaction_ref": "TXN-20261122-0001"
    }
  ]
}
```

---

## 5. Payout Management (`/api/v1/payouts`)

### `GET /api/v1/payouts/partner/outstanding`
Calculates total approved partner shares minus recorded payouts to list active balances.

### `POST /api/v1/payouts/partner`
Records a full or partial payment to a partner.
**Request Body:**
```json
{
  "partner_id": 1,
  "harvest_period": "2026-11",
  "amount_paid": 2500.00,
  "payment_date": "2026-11-22",
  "payment_method": "GCASH",
  "reference_number": "GCASH-9876543210",
  "remarks": "November 2026 partial share"
}
```

---

## 6. Financial Reports & Exports (`/api/v1/reports`)

- `GET /api/v1/reports/daily?report_date=YYYY-MM-DD`
- `GET /api/v1/reports/weekly?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- `GET /api/v1/reports/monthly?period=YYYY-MM`
- `GET /api/v1/reports/custom?...`
- `GET /api/v1/reports/export/excel?...` -> Downloads `.xlsx` spreadsheet with styled financial headers and formulas.
- `GET /api/v1/reports/export/pdf?...` -> Downloads executive landscape PDF.
- `GET /api/v1/reports/export/csv?...` -> Downloads comma-separated values file.
