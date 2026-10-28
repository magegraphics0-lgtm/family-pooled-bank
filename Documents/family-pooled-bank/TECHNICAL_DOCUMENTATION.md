# 🍲 OnePot (Family Pooled Bank) — Technical Documentation & Study Guide
### *Academic Reference Manual & System Architecture Specification*

---

## 1. 🏛️ High-Level Architecture & Tech Stack

OnePot is an academic demonstration and full-stack software prototype of a **closed-loop family pooled banking ledger and financial planning system**. It addresses multi-earner household financial friction, collective emergency savings, and child-to-parent fund request governance within formal and informal family units.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER (Frontend)                     │
│  React 19 • Vite • Lucide Icons • Responsive Glassmorphic Design System │
│  State: React Hooks (useState, useEffect, useCallback) + db.js Service │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ JSON over HTTPS (REST API)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     APPLICATION LAYER (Node.js & Express)               │
│  Modular Routers: /api/auth, /api/family, /api/payments, /api/allocations│
│  Security: bcryptjs (salted hashing) • CORS • Input Validation          │
│  Notification Engine: Asynchronous Nodemailer SMTP Services             │
│  Payment Gateway: Paystack Sandbox API (Simulated Webhook / Callback)   │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ Connection Pool (mysql2/promise)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   PERSISTENCE LAYER (Aiven Cloud MySQL)                 │
│  Managed MySQL 8.0 • InnoDB Engine • Strict UTF-8 (utf8mb4)             │
│  9 Relational Tables with Referential Integrity & Foreign Key Cascades │
└─────────────────────────────────────────────────────────────────────────┘
```

### Complete Technology Stack

| Layer | Technology | Key Modules / Libraries | Purpose in Ecosystem |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React 19.x, Vite 8.x | `lucide-react`, `react-router-dom` | Reactive component rendering, client routing, view-switching, modal forms, and real-time ledger audit views. |
| **Styling & Theme** | CSS Variables, Glassmorphism | Custom design tokens (`src/index.css`) | Light/Dark theme switching engine, Emerald Green palette (`#10b981`), high-contrast slate surfaces. |
| **Client Cache** | `localStorage` API | `LocalDatabase` class (`src/services/db.js`) | Offline session caching, client-side optimistic UI updates, and background synchronization via `syncFromBackend`. |
| **Backend REST API**| Node.js 20+, Express 5.x | `cors`, `dotenv`, `crypto` | Modular REST API routing, session management, RBAC enforcement, cryptographic invite code generation. |
| **Security & Auth** | `bcryptjs` | Salted SHA-512 derivation | Cryptographic password hashing (10 salt rounds), secure comparison, and mitigation of plaintext credential leaks. |
| **Database** | MySQL 8.0 (Aiven Cloud) | `mysql2/promise` | Cloud-hosted relational persistence, ACID transactional safety, foreign key cascade constraints, `DECIMAL(12, 2)` monetary precision. |
| **Notification** | Nodemailer | Asynchronous SMTP | Automated security alerts on user login, welcome emails with invite codes, contribution confirmations, and budget threshold alerts. |
| **Payment Simulation**| Paystack Sandbox API | Node Fetch HTTP client | Mock checkout redirection, payment tokenization, transaction reference generation, and automated 5% emergency auto-save credit. |

---

### End-to-End Client-to-Database Request Lifecycle

Every user operation in OnePot follows a deterministic four-phase pipeline:

```
[User Action in React UI]
       │ (1) User submits form (e.g., Contribution / Allocation Request)
       ▼
[Local Database Service (`src/services/db.js`)]
       │ (2) Performs client-side schema validation & optimistic cache update
       ▼
[HTTP Client (`fetch`)]
       │ (3) Dispatches POST/GET request to `http://localhost:5000/api/...`
       ▼
[Express Server Middleware (`backend/server.js`)]
       │ (4) CORS validation -> JSON body parser (`express.json()`) -> Modular Router dispatch
       ▼
[Domain Controller (`backend/controllers/*`)]
       │ (5) RBAC authorization check (Parent vs. Child role)
       │ (6) Parameter sanitation & business invariant verification
       ▼
[MySQL Connection Pool (`backend/models/db.js`)]
       │ (7) Executes parameterized SQL query (`mysql2/promise`) against Aiven Cloud MySQL
       ▼
[Aiven Cloud MySQL Database (`defaultdb`)]
       │ (8) Commits row transaction, updates pot balances, records audit log
       ▼
[Nodemailer Dispatcher (Non-Blocking Worker)]
       │ (9) Fires async background SMTP alert (Parent alert / Login notice)
       ▼
[Express Response]
       │ (10) Returns standardized JSON: `{ success: true, data: { ... } }`
       ▼
[React Hook State Update]
       │ (11) `db.syncFromBackend(familyId)` updates state, triggering component re-render
       ▼
[Updated UI Displayed to User]
```

---

## 2. 🗄️ Complete Database Schema Breakdown

The OnePot relational schema conforms to Third Normal Form (3NF) across 9 primary entities, using the **InnoDB storage engine** for strict referential integrity and transaction rollbacks.

```mermaid
erDiagram
    families ||--o{ users : "has members"
    families ||--o{ family_members : "tracks membership"
    families ||--o{ contributions : "accumulates pot"
    families ||--o{ paystack_transactions : "logs payments"
    families ||--o{ bowls : "defines budgets"
    families ||--o{ expenses : "records outflows"
    families ||--o{ goals : "defines targets"
    families ||--o{ notifications : "receives alerts"
    users ||--o{ family_members : "participates in"
    users ||--o{ contributions : "deposits"
    users ||--o{ expenses : "requests/spends"
    users ||--o{ approvals : "authorizes"
    expenses ||--o{ approvals : "reviewed by"
    bowls ||--o{ expenses : "categorizes"
```

---

### Detailed Table Specifications

#### 1. `families`
* **Purpose:** Represents the top-level shared vault account and household unit. Holds collective balances.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`): Unique household identifier.
  * `family_name` (`VARCHAR(100) NOT NULL`): The surname or collective label (e.g., "The Adeleke Household").
  * `invite_code` (`VARCHAR(12) NOT NULL UNIQUE`): Cryptographically unique invite token (`FAM-XXXXXX`).
  * `created_by` (`INT(11) DEFAULT NULL`): Foreign key referencing the parent who registered the vault.
  * `total_pot_balance` (`DECIMAL(12, 2) NOT NULL DEFAULT 0.00`): Live pooled cash available for disbursement.
  * `emergency_fund_balance` (`DECIMAL(12, 2) NOT NULL DEFAULT 0.00`): Auto-saved emergency reserve.
  * `auto_save_percentage` (`DECIMAL(5, 2) NOT NULL DEFAULT 5.00`): Percentage diverted from every deposit (default: 5%).
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`): Record creation date.
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL`
* **Ecosystem Connection:** The root node of all family data. All transactions, bowls, and expenses map to `family_id`.

---

#### 2. `users`
* **Purpose:** Stores individual human accounts adhering to the Spotify Family isolated-account model.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`): Unique user identifier.
  * `family_id` (`INT(11) DEFAULT NULL`): Foreign key linking the user to their household.
  * `first_name` (`VARCHAR(100) NOT NULL`), `last_name` (`VARCHAR(100) NOT NULL`): User legal name.
  * `email` (`VARCHAR(255) NOT NULL UNIQUE`): Login email credential.
  * `password_hash` (`VARCHAR(255) NOT NULL`): Salted bcrypt password hash.
  * `role` (`ENUM('parent', 'member') NOT NULL DEFAULT 'member'`): RBAC permission tier.
  * `avatar_url` (`VARCHAR(255) DEFAULT '👑'`): UI profile avatar emoji (`👑`, `🛡️`, `👤`).
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE SET NULL`
* **Ecosystem Connection:** Maps directly into `family_members`, authenticates logins, authors requests, and signs ledger approvals.

---

#### 3. `family_members`
* **Purpose:** Association table mapping family hierarchy, household roles, and join dates.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `family_id` (`INT(11) NOT NULL`): Target household.
  * `user_id` (`INT(11) NOT NULL`): User instance.
  * `role_in_family` (`ENUM('head', 'spouse', 'child') NOT NULL DEFAULT 'child'`): Granular family role.
  * `joined_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
  * `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`
  * `UNIQUE KEY uq_family_user (family_id, user_id)`: Prevents duplicate membership records.
* **Ecosystem Connection:** Powers role-based permission checks in controllers.

---

#### 4. `contributions`
* **Purpose:** Permanent ledger of incoming member pool deposits. Preserves personal salary privacy by tracking contributed amounts only.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `family_id` (`INT(11) NOT NULL`): Household receiving funds.
  * `member_id` (`INT(11) NOT NULL`): User providing funds.
  * `amount` (`DECIMAL(12, 2) NOT NULL`): Total amount contributed in Naira (₦).
  * `source_note` (`VARCHAR(255) DEFAULT NULL`): Purpose or note (e.g., "Monthly Salary Share").
  * `paystack_ref` (`VARCHAR(100) DEFAULT NULL`): Gateway reference linking to `paystack_transactions`.
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
  * `FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE`
* **Ecosystem Connection:** Incrementally increases `families.total_pot_balance` and `families.emergency_fund_balance`.

---

#### 5. `paystack_transactions`
* **Purpose:** Payment gateway transaction log tracking online contributions through simulated or live Paystack checkout flows.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `family_id` (`INT(11) NOT NULL`), `member_id` (`INT(11) NOT NULL`).
  * `reference` (`VARCHAR(100) NOT NULL UNIQUE`): Unique Paystack reference (`onepot_pay_...`).
  * `amount` (`DECIMAL(12, 2) NOT NULL`): Amount in Naira.
  * `status` (`ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending'`).
  * `access_code` (`VARCHAR(100) DEFAULT NULL`), `authorization_url` (`TEXT DEFAULT NULL`).
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`), `verified_at` (`TIMESTAMP NULL DEFAULT NULL`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
  * `FOREIGN KEY (member_id) REFERENCES users(id) ON DELETE CASCADE`
* **Ecosystem Connection:** Precedes entry into `contributions`. Once verified, converts pending money into active pool cash.

---

#### 6. `bowls`
* **Purpose:** "Smart Bowls" represent dynamic category envelopes and budget caps (e.g., Food & Groceries, School Fees, House Rent, PHCN Power).
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `family_id` (`INT(11) NOT NULL`).
  * `category_name` (`VARCHAR(100) NOT NULL`).
  * `allocated_amount` (`DECIMAL(12, 2) NOT NULL DEFAULT 0.00`): Monthly budget cap.
  * `spent_amount` (`DECIMAL(12, 2) NOT NULL DEFAULT 0.00`): Cumulative month-to-date outflows.
  * `priority_level` (`ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium'`).
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
* **Ecosystem Connection:** Destination for fund allocations; destination bowl for child allocation requests; triggers 80% and 100% budget alerts.

---

#### 7. `expenses`
* **Purpose:** Outflow ledger of all household expenses and child allocation requests.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `family_id` (`INT(11) NOT NULL`), `bowl_id` (`INT(11) NOT NULL`).
  * `requested_by_user_id` (`INT(11) NOT NULL`): Initiator (Child or Parent).
  * `amount` (`DECIMAL(12, 2) NOT NULL`): Outflow amount in Naira.
  * `description` (`TEXT NOT NULL`): Explanation or receipt breakdown.
  * `status` (`ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending'`).
  * `is_emergency` (`BOOLEAN NOT NULL DEFAULT FALSE`): Flag for emergency borrowing.
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
  * `FOREIGN KEY (bowl_id) REFERENCES bowls(id) ON DELETE CASCADE`
  * `FOREIGN KEY (requested_by_user_id) REFERENCES users(id) ON DELETE CASCADE`
* **Ecosystem Connection:** Child requests enter as `status = 'pending'`. Upon parent approval, state becomes `'approved'`, triggering pot deductions.

---

#### 8. `approvals`
* **Purpose:** Immutable audit trail documenting parent administrative governance over expenses and emergency requests.
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `expense_id` (`INT(11) NOT NULL`): Foreign key to the reviewed expense.
  * `approved_by_user_id` (`INT(11) NOT NULL`): Foreign key to the parent approver.
  * `status` (`ENUM('approved', 'rejected') NOT NULL`): Administrative decision.
  * `decision_note` (`TEXT DEFAULT NULL`): Written reason or notes from parent.
  * `decided_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE`
  * `FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE CASCADE`
* **Ecosystem Connection:** Establishes accountability for every Naira disbursed from the collective vault.

---

#### 9. `goals`
* **Purpose:** Shared family target vaults for milestone projects (e.g., "Solar Inverter System", "December Village Trip", "Land Acquisition").
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`).
  * `family_id` (`INT(11) NOT NULL`), `created_by_user_id` (`INT(11) NOT NULL`).
  * `title` (`VARCHAR(150) NOT NULL`), `target_amount` (`DECIMAL(12, 2) NOT NULL`).
  * `current_amount` (`DECIMAL(12, 2) NOT NULL DEFAULT 0.00`).
  * `image_url` (`VARCHAR(255) DEFAULT NULL`), `status` (`ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active'`).
  * `created_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
  * `FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE CASCADE`
* **Ecosystem Connection:** Isolates long-term family savings goals from recurring monthly operational bowls.

---

#### 10. `notifications`
* **Purpose:** Dual-channel notification log (in-app alerts and Nodemailer SMTP audit events).
* **Key Columns:**
  * `id` (`INT(11) AUTO_INCREMENT PRIMARY KEY`), `family_id` (`INT(11) NOT NULL`).
  * `user_id` (`INT(11) DEFAULT NULL`): Target user (`NULL` indicates household-wide broadcast).
  * `message` (`TEXT NOT NULL`), `type` (`VARCHAR(50) NOT NULL`): Event type (`allocation_request`, `contribution`, `budget_alert`, etc.).
  * `is_read` (`BOOLEAN NOT NULL DEFAULT FALSE`), `sent_at` (`TIMESTAMP DEFAULT CURRENT_TIMESTAMP`).
* **Foreign Keys & Constraints:**
  * `FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE`
  * `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`

---

## 3. 🔄 Core Business Workflows & Data Flows

### Workflow 1: Private Family Invite & Membership Registration
OnePot operates a **Zero-Unauthenticated Registration Model** where public sign-ups are prohibited.

```mermaid
sequenceDiagram
    autonumber
    actor Parent as Parent Admin
    actor Member as Child / Member
    participant Client as React Client
    participant API as Express REST API
    participant DB as Aiven MySQL

    Parent->>Client: Enters Family Name, Email, Password
    Client->>API: POST /api/auth/register-parent
    API->>API: bcrypt.hash(password, 10)
    API->>API: Generate crypto invite code (FAM-XXXXXX)
    API->>DB: INSERT INTO users (role='parent')
    API->>DB: INSERT INTO families (invite_code, created_by)
    API->>DB: INSERT INTO family_members (role_in_family='head')
    API-->>Parent: Returns user profile, family object, & Invite Code
    Parent->>Member: Shares private invite link (/register?invite=FAM-XXXXXX)
    Member->>Client: Opens registration link
    Client->>API: GET /api/family/verify-invite/FAM-XXXXXX
    API->>DB: SELECT id, family_name FROM families WHERE invite_code=?
    DB-->>API: Returns family details
    API-->>Client: Returns { valid: true, family_name, family_id }
    Member->>Client: Fills in Name, Email, Password, Role (child/spouse)
    Client->>API: POST /api/auth/register-member
    API->>API: Verify invite_code uniqueness & hash password
    API->>DB: INSERT INTO users (role='member')
    API->>DB: INSERT INTO family_members (role_in_family='child')
    API-->>Client: Returns member session & joins household vault
```

---

### Workflow 2: Contribution & 5% Auto-Save Diversion
When a member contributes funds, the platform automatically splits and credits the deposit.

```mermaid
sequenceDiagram
    autonumber
    actor User as Family Contributor
    participant Client as React UI
    participant API as Express API
    participant Paystack as Paystack Sandbox
    participant DB as Aiven MySQL
    participant SMTP as Nodemailer SMTP

    User->>Client: Submits contribution amount (e.g., ₦100,000)
    Client->>API: POST /api/payments/initialize-contribution
    API->>Paystack: POST /transaction/initialize (amount in kobo, reference)
    Paystack-->>API: Returns { authorization_url, access_code, reference }
    API->>DB: INSERT INTO paystack_transactions (status='pending')
    API-->>Client: Returns payment credentials
    User->>Client: Completes simulated sandbox payment flow
    Client->>API: POST /api/payments/verify-contribution (reference)
    API->>Paystack: GET /transaction/verify/:reference
    Paystack-->>API: Returns status: 'success'
    API->>DB: UPDATE paystack_transactions SET status='success'
    API->>DB: INSERT INTO contributions (amount=100000, member_id, paystack_ref)
    Note over API,DB: Calculates 5% Auto-Save: ₦5,000 to Emergency Fund
    API->>DB: UPDATE families SET total_pot_balance = total_pot_balance + 100000, emergency_fund_balance = emergency_fund_balance + 5000
    API->>DB: INSERT INTO notifications (type='contribution')
    API-)SMTP: Non-blocking dispatch of confirmation email to Parents
    API-->>Client: Returns updated total_pot_balance & emergency_fund_balance
    Client->>Client: Re-renders PooledFundCard with dynamic live balance
```

---

### Workflow 3: Child Allocation Request & Parent Approval Pipeline
Enforces strict Role-Based Access Control (RBAC) preventing unauthorized fund dissipation.

```mermaid
sequenceDiagram
    autonumber
    actor Child as Child Member
    actor Parent as Parent Admin
    participant Client as React UI
    participant API as Express API
    participant DB as Aiven MySQL
    participant SMTP as Nodemailer SMTP

    Child->>Client: Submits Request (₦15,000 for "School Books")
    Client->>API: POST /api/allocations/request
    API->>DB: INSERT INTO expenses (status='pending', requested_by_user_id)
    API->>DB: INSERT INTO notifications (for each Parent in family)
    API-)SMTP: Dispatches email alert to Parents
    API-->>Client: Returns staged request record
    Parent->>Client: Logs in and opens Approval Drawer in Header
    Client->>API: GET /api/allocations/requests?family_id=1
    API->>DB: SELECT * FROM expenses WHERE status='pending'
    DB-->>API: Returns pending requests
    API-->>Client: Displays inline Accept / Reject buttons
    Parent->>Client: Clicks "Accept" (Approve)
    Client->>API: POST /api/allocations/:id/approve
    API->>DB: Verify Parent Role in `users`
    API->>DB: Verify `families.total_pot_balance` >= ₦15,000
    API->>DB: UPDATE expenses SET status='approved' WHERE id=:id
    API->>DB: UPDATE families SET total_pot_balance = total_pot_balance - 15000
    API->>DB: UPDATE bowls SET spent_amount = spent_amount + 15000 WHERE id=:bowl_id
    API->>DB: INSERT INTO approvals (expense_id, approved_by_user_id, status='approved')
    API->>DB: INSERT INTO notifications (notifying Child of approval)
    API-)SMTP: Dispatches approval email to Child
    API-->>Client: Returns { success: true, total_pot_balance, bowl }
    Client->>Client: Re-renders Dashboard ledger & Smart Bowl meters
```

---

## 4. 📡 API Endpoint Reference

| Method | Endpoint Path | Headers & Payload | Expected Response (JSON) | RBAC Scope |
| :--- | :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register-parent` | `{ family_name, first_name, last_name, email, password, avatar }` | `201 Created`: `{ success, user, family, invite_code }` | Public (Unauthenticated) |
| `POST` | `/api/auth/register-member` | `{ invite_code, first_name, last_name, email, password, role_in_family }`| `201 Created`: `{ success, user, family }` | Invite Required |
| `POST` | `/api/auth/login` | `{ email, password }` | `200 OK`: `{ success, message, user, family }` | Public |
| `GET` | `/api/auth/me` | `?user_id=1` or `x-user-id: 1` | `200 OK`: `{ success, user, family }` | Authenticated Session |
| `POST` | `/api/auth/forgot-password` | `{ email }` | `200 OK`: `{ success, message }` (Silent non-enumeration) | Public |
| `GET` | `/api/family/verify-invite/:code` | Path parameter: `:code` | `200 OK`: `{ valid: true, family_name, family_id, invite_code }` | Public |
| `GET` | `/api/family/:id` | Path parameter: `:id` | `200 OK`: `{ success, data: familyObject }` | Family Members |
| `GET` | `/api/users` | Query: `?family_id=1` | `200 OK`: `{ success, data: [ users ] }` | Family Members |
| `GET` | `/api/bowls` | Query: `?family_id=1` | `200 OK`: `{ success, data: [ bowls ] }` (Auto-seeds if empty) | Family Members |
| `GET` | `/api/pooled-fund` | Query: `?family_id=1` | `200 OK`: `{ success, data: { pool_id, balance, emergency_fund_balance } }`| Family Members |
| `GET` | `/api/pool-transactions` | Query: `?family_id=1` | `200 OK`: `{ success, data: [ contributions + allocations ] }` | Family Members |
| `POST` | `/api/pool-transactions/contribute`| `{ user_id, amount, purpose, source_note, family_id }` | `200 OK`: `{ success, message, data: { total_pot_balance } }` | Family Members |
| `POST` | `/api/payments/initialize-contribution`| `{ family_id, member_id, amount, source_note }` | `200 OK`: `{ success, data: { reference, authorization_url } }` | Family Members |
| `POST` | `/api/payments/verify-contribution`| `{ reference, family_id, member_id, amount }` | `200 OK`: `{ success, data: { total_pot_balance, emergency_fund_balance } }`| Family Members |
| `GET` | `/api/expenses` | Query: `?family_id=1` | `200 OK`: `{ success, count, data: [ expenses ] }` | Family Members |
| `POST` | `/api/expenses` | `{ user_id, family_id, bowl_id, amount, description }` | `201 Created`: `{ success, data: newExpense }` | Family Members |
| `POST` | `/api/budget-limits` | `{ bowl_id, amount, family_id }` | `200 OK`: `{ success, message, data: { allocated_amount } }` | Parents Only |
| `POST` | `/api/allocations/request` | `{ family_id, child_id, bowl_id, amount, description }` | `201 Created`: `{ success, message, data: requestRecord }` | Child Members |
| `POST` | `/api/allocations/:id/approve` | `{ user_id, approved_by_user_id }` | `200 OK`: `{ success, data: { total_pot_balance, status } }` | Parents Only |
| `POST` | `/api/allocations/:id/reject` | `{ user_id, rejected_by_user_id, reason }` | `200 OK`: `{ success, data: { status: 'rejected' } }` | Parents Only |
| `POST` | `/api/allocations/direct` | `{ user_id, bowl_id, amount, purpose, family_id }` | `200 OK`: `{ success, data: { total_pot_balance } }` | Parents Only |
| `GET` | `/api/allocations/requests`| Query: `?family_id=1` | `200 OK`: `{ success, data: [ pendingRequests ] }` | Family Members |
| `GET` | `/api/notifications` | Query: `?family_id=1` | `200 OK`: `{ success, data: [ notifications ] }` | Family Members |
| `PUT` | `/api/notifications/read-all` | Body: `{ family_id }` | `200 OK`: `{ success, message: "All notifications marked as read" }` | Family Members |

---

## 5. 💻 Frontend Architecture & State Flow

The React frontend utilizes a single-page reactive architecture organized into focused functional views and modal components.

```
src/
├── main.jsx                     --> Application root bootstrap with strict error boundary
├── App.jsx                      --> Master state coordinator, view switch router, theme manager
├── index.css                    --> Global Design System, CSS variables, & responsive utilities
│
├── components/
│   ├── LandingPage.jsx          --> Public hero, feature breakdown, academic disclaimer, footer
│   ├── RegisterPage.jsx         --> Private invite verification route (/register?invite=CODE)
│   ├── AuthModal.jsx            --> Minimalist Login & Parent Family Registration modal card
│   ├── Header.jsx               --> Brand header, RBAC badge, Notification/Approval drawer, theme toggle
│   ├── Dashboard.jsx            --> Executive metric tiles, Unified Household History table, quick actions
│   ├── PooledFundCard.jsx       --> Central Pot Balance display card, Contribute & Allocate actions
│   ├── BudgetManager.jsx        --> Smart Bowls monthly cap configuration, progress meters, & edit modal
│   ├── PoolTransactionsLog.jsx  --> Permanent transparency audit ledger of pool inflows & outflows
│   ├── PeriodicReport.jsx       --> Comprehensive statement of cash flows, category variance, print view
│   ├── FamilyInviteCard.jsx     --> Private invite code badge with one-click URL copy
│   ├── ExpenseFormModal.jsx     --> Modal form for logging household expenses with category picker
│   ├── AllocationRequestModal.jsx-> Child modal form for submitting fund allocation requests
│   └── DepositAccountModal.jsx  --> Modal for linking external settlement bank accounts
│
└── services/
    ├── db.js                    --> LocalDatabase reactive client service & backend REST syncer
    └── smtpService.js           --> Client-side automated budget threshold email payload builder
```

### State Flow & Synchronization

1. **Authentication State:**
   * Handled in `App.jsx` via `useState(initialSession?.user || null)`.
   * Sessions persist across browser reloads via `localStorage.getItem('family_bank_auth_session')`.
   * On successful authentication (`handleLoginSuccess`), user and family records are saved to storage, initializing the active view.

2. **Reactive Local Database (`src/services/db.js`):**
   * Acts as a client-side Data Access Object (DAO) pattern.
   * `syncFromBackend(familyId)` issues parallel asynchronous requests (`Promise.all`) fetching pooled funds, transactions, smart bowls, expenses, and notifications from the Express API.
   * Eliminates prop drilling by allowing child components to read synchronously (`db.getPooledFund(fid)`) while mutations asynchronously persist to Aiven MySQL.

3. **Theme Management Engine:**
   * Evaluates `localStorage.getItem('onepot_theme')` and falls back to `window.matchMedia('(prefers-color-scheme: dark)')`.
   * Automatically synchronizes the `data-theme="light"` or `data-theme="dark"` attribute on the `document.documentElement` DOM node.

---

## 6. 🎓 Technical Defense & Exam Study Guide (Q&A)

Here are the most critical technical questions an engineering evaluator, professor, or technical reviewer will ask regarding this architecture, accompanied by authoritative answers:

### Q1: How does OnePot prevent race conditions and balance discrepancies when two family members contribute or allocate funds simultaneously?
> **Answer:**
> Concurrency is maintained through **atomic database operations** in MySQL rather than calculating balances in Node.js application memory. 
> When approving an allocation or confirming a contribution, the controller executes atomic arithmetic expressions:
> ```sql
> UPDATE families 
> SET total_pot_balance = total_pot_balance + ?, emergency_fund_balance = emergency_fund_balance + ? 
> WHERE id = ?;
> ```
> MySQL's InnoDB engine places an **exclusive row-level lock (`X-lock`)** on the target `families` row for the duration of the update transaction. If two transactions arrive at the same millisecond, InnoDB serializes them sequentially, ensuring balance mutations never overwrite each other.

---

### Q2: Why did you implement a "Zero-Unauthenticated Registration Model" with private family invite codes instead of an open public sign-up?
> **Answer:**
> Traditional banking apps allow open public sign-ups because accounts are isolated individuals. However, OnePot is engineered around a **shared household collective (the Family Pot)**.
> Allowing unauthenticated open registration creates orphan users who do not belong to any household vault. By implementing cryptographic `FAM-XXXXXX` invite tokens generated exclusively by verified Parent Admins:
> 1. We guarantee every member record in `family_members` enforces a valid foreign key relation to an existing `family_id`.
> 2. We prevent malicious third parties from discovering or joining a private family ledger without explicit parental authorization.
> 3. Direct registration without a validated invite parameter is blocked at both client and controller validation tiers.

---

### Q3: How does the system address personal income privacy versus household financial transparency?
> **Answer:**
> In Nigerian and broader African cultural contexts, members often hesitate to disclose their full personal income due to extended family financial pressure ("Black Tax").
> OnePot solves this via the **Chapter 3 Spotify Family Model**:
> * Individual salaries are strictly private. The database does not require members to log their external employer paychecks.
> * Transparency is enforced strictly at the **Contribution Boundary**: once a member chooses to transfer funds from their private wallet into the shared pot, that specific transaction is logged permanently in `contributions` and displayed on the audit ledger. Members retain income privacy while the household achieves 100% accountability on shared expenditures.

---

### Q4: How is Role-Based Access Control (RBAC) enforced between Parents and Children, and why isn't client-side UI hiding sufficient?
> **Answer:**
> While the React frontend conditionally renders "Allocate Pooled Funds" for Parents and "Request Fund Allocation" for Children, client-side hiding is only for UX and does not provide security.
> True RBAC is enforced strictly at the **Express Controller and Database Layer**:
> In `backend/controllers/allocationController.js`:
> 1. The controller extracts the user ID from the request.
> 2. It queries MySQL: `SELECT role FROM users WHERE id = ?`.
> 3. If `user.role !== 'parent'`, the server halts execution immediately and returns an `HTTP 403 Forbidden` response:
>    ```json
>    { "success": false, "error": "Access Denied: Only Parent Managers are authorized to allocate pooled funds." }
>    ```
> Even if a malicious actor crafts a manual `curl` or Postman request to `/api/allocations/:id/approve`, the server rejects the request.

---

### Q5: How does the platform protect database credentials and Paystack API keys across environments?
> **Answer:**
> Security follows the **12-Factor App methodology**:
> * All secrets, connection strings, and API keys are decoupled from version control and loaded into `process.env` at runtime using `dotenv`.
> * The Aiven Cloud MySQL connection string (`mysql://avnadmin:***@...aivencloud.com:19258/defaultdb`) requires TLS/SSL encryption for data in transit.
> * The Paystack keys (`PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY`) differentiate between `sk_test_...` (sandbox mode) and live keys. The codebase checks key prefixes and switches dynamically between simulated sandbox flows and live Paystack transaction initialization without changing the core business logic.

---

### Q6: Why did you use `DECIMAL(12, 2)` instead of `FLOAT` or `DOUBLE` for financial amounts in the database?
> **Answer:**
> `FLOAT` and `DOUBLE` are binary floating-point types governed by IEEE 754 standards. They represent numbers as fractional binary approximations, causing rounding errors when accumulating fractions (for example, `0.1 + 0.2 === 0.30000000000000004` in floating-point math). In a banking ledger, fractional approximations cause unexplainable currency losses.
> In contrast, `DECIMAL(12, 2)` is an **exact fixed-point data type**. It stores values as binary-coded decimals (BCD) with guaranteed precision up to 12 digits, exactly 2 of which are decimal places. This ensures monetary calculations are accurate to the exact Kobo/Cent.

---

### Q7: If the live cloud database or network experiences high latency, how does the application maintain responsiveness for the user?
> **Answer:**
> The frontend implements an **Optimistic Client-Side Cache Strategy**:
> * In `src/services/db.js`, mutations (such as logging an expense or contributing funds) immediately update the local reactive cache in memory and `localStorage`, providing immediate visual feedback to the user without a blocking spinner.
> * The mutation simultaneously dispatches the HTTP request to the Express API in the background.
> * Once the database confirms the transaction, `syncFromBackend(familyId)` reconciles any server-side autoincrement IDs, balances, and timestamps, ensuring eventual consistency without sacrificing UI responsiveness.

---

### Q8: What design pattern is used to handle email alerts without degrading the user experience during transaction processing?
> **Answer:**
> The system implements an **Asynchronous Non-Blocking Notification Pattern**.
> When a contribution is verified in `paymentController.js` or a request is logged in `allocationController.js`:
> 1. The database transaction is committed first.
> 2. The HTTP response is returned immediately to the client with `res.json(...)`.
> 3. The Nodemailer email functions (`sendContributionConfirmationEmail`, `sendEmail`) are invoked asynchronously with unchained promise catches:
>    ```javascript
>    sendContributionConfirmationEmail({ ... }).catch(err => {
>      console.error('[CONTRIBUTION EMAIL ERROR]', err.message);
>    });
>    ```
> This ensures that even if the external SMTP gateway experiences latency or timeouts, the user's banking transaction succeeds in milliseconds without being held up by external email networks.
