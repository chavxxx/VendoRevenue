# GARTECH VENDO – Database Schema & Data Dictionary
## PostgreSQL 16 Normalized Relational Architecture

---

## 1. Entity Relationship Overview

```
 ┌─────────────┐            ┌──────────────┐
 │    users    ├───────────►│   partners   │
 └──────┬──────┘            └──────┬───────┘
        │                          │ 1
        │                          │
        │                          │ *
        │                   ┌──────▼───────┐             ┌──────────────┐
        ├──────────────────►│vendo_machines├────────────►│    staff     │
        │                   └──────┬───────┘             └──────┬───────┘
        │                          │ 1                          │
        │                          │                            │
        │                          │ *                          │
        │                   ┌──────▼───────────┐                │
        ├──────────────────►│harvest_transact. ├────────────────┘
        │                   └──────┬───────────┘
        │                          │ 1
        │                          │
        │                          │ *
        │                   ┌──────▼───────────┐
        │                   │harvest_attachment│
        │                   └──────────────────┘
        │
        ├──────────────────► partner_payouts
        ├──────────────────► staff_payouts
        └──────────────────► audit_logs
```

---

## 2. Table Specifications

### 2.1. `users`
System user accounts, credentials, and RBAC definitions.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY, AUTO_INCREMENT | Unique user ID |
| `username` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEXED | Login username |
| `email` | `VARCHAR(100)` | UNIQUE, NOT NULL, INDEXED | Email address |
| `hashed_password` | `VARCHAR(255)` | NOT NULL | Salted bcrypt hash |
| `full_name` | `VARCHAR(100)` | NOT NULL | Complete legal name |
| `phone` | `VARCHAR(20)` | NULLABLE | Contact telephone / mobile |
| `role` | `VARCHAR(30)` | NOT NULL, INDEXED | `SUPER_ADMIN`, `ADMIN_ACCOUNTING`, `STAFF_ENCODER`, `FIELD_HARVESTER`, `PARTNER` |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Account state |
| `partner_id` | `INTEGER` | NULLABLE, FK -> `partners.id` | Partner link if role is `PARTNER` |
| `staff_id` | `INTEGER` | NULLABLE, FK -> `staff.id` | Staff link if role is `STAFF_ENCODER` or `FIELD_HARVESTER` |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT UTC | Account creation date |
| `updated_at` | `TIMESTAMP` | NOT NULL, DEFAULT UTC | Last profile update |

---

### 2.2. `partners`
Location hosts and partner businesses where WiFi vendo machines are physically installed.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY, AUTO_INCREMENT | Unique partner ID |
| `partner_code` | `VARCHAR(20)` | UNIQUE, NOT NULL, INDEXED | Human-readable code (e.g. `PRT-001`) |
| `name` | `VARCHAR(150)` | NOT NULL, INDEXED | Partner or business name |
| `contact_person`| `VARCHAR(100)` | NULLABLE | Primary representative |
| `phone` | `VARCHAR(25)` | NULLABLE | Primary mobile number |
| `email` | `VARCHAR(100)` | NULLABLE | Contact email |
| `address` | `VARCHAR(255)` | NOT NULL | Purok, street address |
| `city` | `VARCHAR(100)` | NOT NULL, DEFAULT 'Valencia' | Municipality / City |
| `province` | `VARCHAR(100)` | NOT NULL, DEFAULT 'Bukidnon'| Province |
| `default_share_percentage` | `NUMERIC(5,2)` | NOT NULL, DEFAULT 25.00 | Negotiated revenue share |
| `bank_name` | `VARCHAR(100)` | NULLABLE | Target bank name |
| `bank_account_name` | `VARCHAR(100)` | NULLABLE | Bank account name |
| `bank_account_number` | `VARCHAR(50)` | NULLABLE | Bank account number |
| `gcash_number` | `VARCHAR(25)` | NULLABLE | GCash disbursement phone |
| `is_active` | `BOOLEAN` | NOT NULL, DEFAULT TRUE | Partner contract state |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT UTC | Registration timestamp |

---

### 2.3. `vendo_machines`
Physical coin-operated WiFi vendo hardware units.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY, AUTO_INCREMENT | Internal machine ID |
| `vlan_id` | `INTEGER` | UNIQUE, NOT NULL, INDEXED | **Primary operational identifier** (e.g., `101`, `102`) |
| `vendo_name` | `VARCHAR(150)` | NOT NULL, INDEXED | Friendly name |
| `partner_id` | `INTEGER` | NOT NULL, FK -> `partners.id` | Assigned location partner |
| `complete_address` | `VARCHAR(255)` | NOT NULL | Installation site address |
| `city_municipality` | `VARCHAR(100)` | NOT NULL, DEFAULT 'Valencia' | City / Municipality |
| `province` | `VARCHAR(100)` | NOT NULL, DEFAULT 'Bukidnon' | Province |
| `latitude` | `FLOAT` | NULLABLE | GPS Latitude |
| `longitude` | `FLOAT` | NULLABLE | GPS Longitude |
| `assigned_staff_id` | `INTEGER` | NULLABLE, FK -> `staff.id` | Assigned supervising staff |
| `assigned_harvester_id` | `INTEGER` | NULLABLE, FK -> `staff.id` | Assigned field harvester |
| `installation_date` | `DATE` | NOT NULL | Physical deployment date |
| `status` | `VARCHAR(30)` | NOT NULL, INDEXED | `ACTIVE`, `INACTIVE`, `UNDER_MAINTENANCE`, `REMOVED` |
| `remarks` | `TEXT` | NULLABLE | Notes or hardware specs |

---

### 2.4. `harvest_transactions`
The immutable monthly coin collection and financial split ledger.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY, AUTO_INCREMENT | Transaction ID |
| `transaction_ref` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEXED | Formatted reference `TXN-YYYYMMDD-XXXX` |
| `vendo_id` | `INTEGER` | NOT NULL, FK -> `vendo_machines.id`| Machine link |
| `vlan_id` | `INTEGER` | NOT NULL, INDEXED | Denormalized VLAN ID for historical query |
| `partner_id` | `INTEGER` | NOT NULL, FK -> `partners.id` | Partner earning 25% share |
| `harvester_id` | `INTEGER` | NULLABLE, FK -> `staff.id` | Field staff earning 5% incentive |
| `encoded_by_user_id`| `INTEGER` | NOT NULL, FK -> `users.id` | User who created the transaction |
| `harvest_date` | `DATE` | NOT NULL, INDEXED | Date coins were collected |
| `harvest_period` | `VARCHAR(7)` | NOT NULL, INDEXED | Period string `YYYY-MM` (enforces 1 harvest/month) |
| `gross_harvest` | `NUMERIC(12,2)`| NOT NULL | Total gross coins collected (₱) |
| `partner_percentage`| `NUMERIC(5,2)` | NOT NULL | Partner share percentage (frozen) |
| `partner_share` | `NUMERIC(12,2)`| NOT NULL | Computed partner share amount (₱) |
| `staff_percentage` | `NUMERIC(5,2)` | NOT NULL | Staff incentive percentage (frozen) |
| `staff_incentive` | `NUMERIC(12,2)`| NOT NULL | Computed staff incentive amount (₱) |
| `gartech_percentage`| `NUMERIC(5,2)`| NOT NULL | GARTECH percentage (frozen) |
| `gartech_net` | `NUMERIC(12,2)`| NOT NULL | Retained GARTECH company revenue (₱) |
| `status` | `VARCHAR(30)` | NOT NULL, INDEXED | `DRAFT`, `SUBMITTED`, `APPROVED`, `REJECTED`, `VOIDED` |
| `partner_confirmed`| `BOOLEAN` | NOT NULL, DEFAULT FALSE | Whether partner acknowledged count |
| `partner_signature_path`| `VARCHAR(255)`| NULLABLE | Digital signature PNG path |
| `remarks` | `TEXT` | NULLABLE | Collector notes |
| `rejection_reason` | `TEXT` | NULLABLE | Reason if rejected |
| `void_reason` | `TEXT` | NULLABLE | Reason if voided by Super Admin |
| `approved_by_user_id`| `INTEGER` | NULLABLE, FK -> `users.id` | Approving administrator |
| `approved_at` | `TIMESTAMP` | NULLABLE | Approval timestamp |
| `client_uuid` | `VARCHAR(64)` | UNIQUE, NULLABLE, INDEXED | Idempotency UUID from mobile offline sync |
| `is_offline_sync` | `BOOLEAN` | NOT NULL, DEFAULT FALSE | True if uploaded via batch sync |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT UTC | Creation timestamp |

---

### 2.5. `partner_payouts` & `staff_payouts`
Cash and electronic disbursement ledgers.

| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `INTEGER` | PRIMARY KEY, AUTO_INCREMENT | Payout ID |
| `payout_ref` | `VARCHAR(50)` | UNIQUE, NOT NULL, INDEXED | Formatted reference `PAY-PRT-YYYYMMDD-XXXX` |
| `partner_id` / `staff_id` | `INTEGER` | NOT NULL | Recipient partner or staff ID |
| `harvest_period` | `VARCHAR(7)` | NOT NULL, INDEXED | Harvest period covered |
| `total_share_amount`| `NUMERIC(12,2)`| NOT NULL | Total accumulated approved share |
| `amount_paid` | `NUMERIC(12,2)`| NOT NULL | Actual cash/electronic disbursed amount |
| `remaining_balance`| `NUMERIC(12,2)`| NOT NULL | Outstanding balance post-payment |
| `payment_date` | `DATE` | NOT NULL | Disbursement date |
| `payment_method` | `VARCHAR(30)` | NOT NULL | `CASH`, `GCASH`, `BANK_TRANSFER`, `CHECK` |
| `reference_number` | `VARCHAR(100)` | NULLABLE | Voucher or GCash / Bank reference |
| `remarks` | `TEXT` | NULLABLE | Disbursement notes |
| `receipt_file_path`| `VARCHAR(255)` | NULLABLE | Scanned voucher / receipt attachment |
| `paid_by_user_id` | `INTEGER` | NOT NULL, FK -> `users.id` | Disbursing accounting user |
| `created_at` | `TIMESTAMP` | NOT NULL, DEFAULT UTC | Timestamp |

---

### 2.6. `audit_logs`
Immutable system-wide event trail.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | `INTEGER` PRIMARY KEY | Unique log ID |
| `user_id` | `INTEGER` FK -> `users.id` | Acting user |
| `action` | `VARCHAR(50)` | `LOGIN`, `CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `VOID`, `PAYOUT` |
| `entity_type` | `VARCHAR(50)` | `HARVEST`, `VENDO`, `PARTNER`, `PAYOUT`, `USER`, `CONFIG` |
| `entity_id` | `VARCHAR(50)` | Identifier of the affected record |
| `old_values` | `TEXT` (JSON) | State prior to modification |
| `new_values` | `TEXT` (JSON) | State after modification |
| `ip_address` | `VARCHAR(45)` | Client IP address |
| `created_at` | `TIMESTAMP` | Exact event timestamp |
