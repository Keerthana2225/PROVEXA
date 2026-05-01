# 🛡️ Provexa — Employee Asset & Replacement Management System

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

> Full-stack enterprise system for employee asset distribution, digital signature acknowledgement, replacement requests, and Excel/PDF reporting.

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Architecture Explanation](#2-architecture-explanation)
3. [API Documentation](#3-api-documentation)
4. [Code Walkthrough](#4-code-walkthrough)
5. [Database Schema](#5-database-schema)
6. [Feature Explanation](#6-feature-explanation)
7. [Workflow Explanation](#7-workflow-explanation)
8. [Installation Guide](#8-installation-guide)
9. [Deployment Guide](#9-deployment-guide)
10. [Testing Guide](#10-testing-guide)
11. [GitHub Usage Guide](#11-github-usage-guide)

---

## 1. Project Overview

**Provexa** is built for HR, Administration, and Store Management departments to track employee assets — uniforms, safety equipment, tools, PPE kits.

### For Interviews
> "Provexa is a MERN-stack enterprise app I built to digitise asset distribution. The standout feature is a two-stage digital signature workflow — admins bulk-issue assets, employees sign on a digital pad, the backend saves the PNG and embeds it into styled Excel reports using ExcelJS. Records are archived non-destructively for complete audit trails."

### Comparison Table

| Feature | Provexa | Basic Systems |
|---------|---------|---------------|
| Digital Signature | ✅ Touch-based PNG storage | ❌ Paper-based |
| Bulk Issuance | ✅ Multi-employee one click | ❌ One at a time |
| Excel with Signatures | ✅ Images embedded in cells | ❌ Text-only CSV |
| Archive (Non-destructive) | ✅ Soft delete, full audit | ❌ Permanent delete |
| Replacement Workflow | ✅ Request → Approve/Reject | ❌ Not available |

---

## 2. Architecture Explanation

```
BROWSER (React 18 + Vite)
React Query → Axios → JWT Header
        ↓ HTTP REST
NODE.JS + EXPRESS (Port 5000)
Auth Middleware → Routes → Mongoose
ExcelJS/PDFKit → /public/signatures/
        ↓
MONGODB (ProvexaDB)
Admin | Employee | Item | ItemCategory
IssueRecord | ReplacementRequest
```

### Frontend Stack

| Library | Purpose |
|---------|---------|
| React 18 + Vite | SPA, fast HMR |
| TanStack React Query | Server state, caching |
| Tailwind CSS | Utility styling |
| react-signature-canvas | Digital signature capture |
| Recharts | Dashboard charts |
| lucide-react | Icons |
| axios | HTTP client |
| dayjs | Date formatting |

### Backend Stack

| Library | Purpose |
|---------|---------|
| Express 5 | REST API |
| Mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT authentication |
| ExcelJS | Excel + image embedding |
| PDFKit | PDF generation |
| node-cron | Scheduled overdue checks |

---

## 3. API Documentation

> Base URL: `http://localhost:5000`
> All endpoints (except login) require: `Authorization: Bearer <token>`

### POST `/api/auth/login`
```json
Request:  { "email": "admin@provexa.com", "password": "admin123" }
Response: { "token": "eyJ...", "admin": { "id": "...", "name": "Admin", "email": "..." } }
```

### GET `/api/employees`
```json
Response: [{ "id":"...", "emp_code":"EMP001", "name":"Ravi", "department":"Security", "designation":"Guard" }]
```

### POST `/api/employees`
```json
Request:  { "emp_code":"EMP010", "name":"Anitha", "department":"HR", "designation":"Executive" }
Response: 201 Created employee object
```

### GET `/api/categories`
```json
Response: [{ "id":"...", "name":"Uniforms" }, { "id":"...", "name":"Safety Gear" }]
```

### GET `/api/items`
```json
Response: [{ "id":"...", "name":"Safety Helmet", "category":{"name":"Safety Gear"}, "frequency_days":365 }]
```

### POST `/api/items`
```json
// Frequency mode:  { "name":"Work Shirt",    "category":"cat_id", "frequency_days":180 }
// Fixed date mode: { "name":"Annual Jacket",  "category":"cat_id", "fixed_date":"2025-12-31" }
```

### GET `/api/issues`
```json
Response: [{ "id":"...", "employee":{...}, "item":{...}, "issue_status":"Pending Acknowledgement", "acknowledged":false }]
```

### POST `/api/issues` — Bulk Issue
```json
Request: {
  "items": [
    { "employee_id":"emp1", "item_id":"item1", "issued_date":"2025-05-01", "next_due_date":"2026-05-01", "quantity":1 },
    { "employee_id":"emp2", "item_id":"item1", "issued_date":"2025-05-01", "next_due_date":"2026-05-01", "quantity":1 }
  ]
}
Response: { "message": "2 records created successfully" }
```

### POST `/api/issues/sign/:employeeId` — Digital Signature
```json
Request:  { "signature": "data:image/png;base64,iVBORw0KGgo..." }
Response: { "message": "Signature saved. 3 records acknowledged.", "signature_path": "/public/signatures/EMP001_1714567890.png" }
```

### POST `/api/issues/archive` — Soft Reset
```json
Request:  { "archive_reason": "Annual cycle reset FY 2025-26" }
Response: { "message": "42 records archived successfully." }
```

### PATCH `/api/replacements/:id` — Approve/Reject
```json
Request:  { "status": "approved", "notes": "New helmet issued." }
Response: 200 Updated replacement request
```

### GET `/api/reports/issues?format=xlsx`
- Query params: `format=xlsx` or `format=pdf`
- Optional: `?startDate=2025-01-01&endDate=2025-12-31&department=Security`
- Response: File download

### GET `/api/dashboard/stats`
```json
Response: {
  "totalEmployees": 45, "totalItems": 12, "totalActiveIssues": 120,
  "pendingAcknowledgements": 8, "overdueItems": 5, "pendingReplacements": 2
}
```

---

## 4. Code Walkthrough

### Folder Structure
```
PROVEXA/
├── client/
│   └── src/
│       ├── components/ui/       # Reusable: Buttons, Modals, Badges
│       ├── lib/                 # Axios instance, helpers
│       └── pages/
│           ├── Login.jsx        # JWT login form
│           ├── Dashboard.jsx    # Recharts analytics
│           ├── Employees.jsx    # CRUD employees
│           ├── Items.jsx        # Item + Category management
│           ├── Issues.jsx       # Bulk Issue + Signature (main page)
│           ├── DueTracking.jsx  # Overdue asset tracker
│           ├── Replacements.jsx # Replacement requests
│           └── Reports.jsx      # Excel/PDF downloads
│
└── server/
    ├── models/
    │   ├── Admin.js
    │   ├── Employee.js
    │   ├── Item.js
    │   ├── ItemCategory.js
    │   ├── IssueRecord.js       # Core: archive + signature fields
    │   └── ReplacementRequest.js
    ├── routes/
    │   ├── auth.js
    │   ├── employees.js
    │   ├── items.js
    │   ├── issues.js            # Bulk issue + sign endpoint
    │   ├── replacements.js
    │   ├── dashboard.js
    │   └── reports.js           # ExcelJS + PDFKit
    ├── middleware/
    │   └── check_admin.js       # JWT verify middleware
    ├── jobs/
    │   └── cron.js              # Daily overdue check
    ├── public/signatures/       # Saved PNG files
    ├── seed.js                  # DB seed script
    └── index.js                 # Entry point
```

### Key Files Explained

- **`server/index.js`** — Connects MongoDB, global Mongoose plugin (`_id` → `id`), registers all routes.
- **`server/models/IssueRecord.js`** — Core model with `acknowledged`, `signature_path`, `archived`, `archive_reason`.
- **`server/routes/issues.js`** — Decodes Base64 PNG → writes to `/public/signatures/` → bulk-updates records.
- **`server/routes/reports.js`** — ExcelJS builder with embedded signature images, styled headers, conditional row coloring.
- **`client/src/pages/Issues.jsx`** — Most complex page: bulk issue modal, signature modal, view proof modal.

---

## 5. Database Schema

### Relationships
```
ItemCategory ──< Item ──< IssueRecord >── Employee
                               └── [signature_path, archived, acknowledged]
Employee ──< ReplacementRequest >── Item
Admin ──< IssueRecord (issued_by, archived_by)
```

### Admin
| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| email | String | required, unique |
| password_hash | String | bcrypt hashed |
| created_at | Date | auto |

### Employee
| Field | Type | Notes |
|-------|------|-------|
| emp_code | String | required, unique (e.g. EMP001) |
| name | String | required |
| department | String | required |
| designation | String | required |
| status | String | 'active' / 'inactive' |

### Item
| Field | Type | Notes |
|-------|------|-------|
| name | String | required |
| category | ObjectId | → ItemCategory |
| frequency_days | Number | null if using fixed_date |
| fixed_date | Date | null if using frequency |

### IssueRecord (Core)
| Field | Type | Notes |
|-------|------|-------|
| employee | ObjectId | → Employee |
| item | ObjectId | → Item |
| issued_date | Date | required |
| next_due_date | Date | required |
| quantity | Number | default: 1 |
| issued_by | ObjectId | → Admin |
| issue_status | Enum | 'Pending Acknowledgement' / 'Acknowledged' |
| signature_path | String | path to PNG file |
| acknowledged | Boolean | default: false |
| acknowledgement_time | Date | when signed |
| archived | Boolean | default: false |
| archived_at | Date | when archived |
| archive_reason | String | reason for archive |

### ReplacementRequest
| Field | Type | Notes |
|-------|------|-------|
| employee | ObjectId | → Employee |
| item | ObjectId | → Item |
| reason | String | required |
| status | Enum | 'pending' / 'approved' / 'rejected' |
| resolved_by | ObjectId | → Admin |

---

## 6. Feature Explanation

### ✍️ Digital Signature Workflow
1. Admin bulk-issues assets → records created as `Pending Acknowledgement`
2. Employee draws signature on `react-signature-canvas`
3. Frontend sends `data:image/png;base64,...` to backend
4. Backend strips header, writes PNG to `/public/signatures/EMP001_timestamp.png`
5. All pending records for that employee → `acknowledged: true`, `Acknowledged`

### 📊 Advanced Excel Reporting
- `ExcelJS` used (not xlsx) because it supports **image embedding**
- Header row: corporate blue `#3B4A9A`, white bold text
- `Acknowledged` column: 🟢 Green = Yes, 🟡 Yellow = No
- Signature embedded with pixel-exact dimensions (320×110px)
- Row height: 130px if has signature, 22px otherwise
- Row 1 frozen for easy scrolling

### 🏛️ Archive System (Non-Destructive)
- "Reset Current Issues" → sets `archived: true` on all active records
- Active view queries `{ archived: false }` only
- All data preserved for audits and historical reports

### 📅 Dual Scheduling
- **Frequency Mode:** `frequency_days: 365` → due = issued + 365 days
- **Fixed Date Mode:** `fixed_date: "2025-12-31"` → specific calendar date

---

## 7. Workflow Explanation (Step by Step)

```
SETUP
 1. Admin logs in (JWT token)
 2. Create Item Categories ("Uniforms", "Safety Gear")
 3. Create Items with scheduling mode
 4. Add Employees with emp_code + department

ISSUANCE
 5. Open Issue Management → "Bulk Issue"
 6. Select employees + item + quantity
 7. System auto-calculates next_due_date
 8. IssueRecords created → "Pending Acknowledgement"

ACKNOWLEDGEMENT
 9. Admin clicks ✏️ pen icon next to employee
10. Modal shows all pending items for that employee
11. Employee draws signature on canvas
12. Submit → PNG saved, records marked "Acknowledged" ✅

REPORTING
13. Admin → Reports page
14. Select date range / department
15. Export Excel → .xlsx with embedded signatures downloaded

ARCHIVE (End of Cycle)
16. Admin clicks "Reset Current Issues"
17. All active records archived (soft delete)
18. New distribution cycle begins cleanly
```

---

## 8. Installation Guide

### Prerequisites
- Node.js v18+ → https://nodejs.org
- MongoDB Community → https://www.mongodb.com/try/download/community
- Git → https://git-scm.com

### Clone Repository
```bash
git clone https://github.com/Keerthana2225/PROVEXA.git
cd PROVEXA
```

### Backend Setup
```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
DATABASE_URL=mongodb://localhost:27017/ProvexaDB
JWT_SECRET=your_super_secret_key_here
```

```bash
npm run seed    # Creates admin + sample data
npm run dev     # Server runs at http://localhost:5000
```

### Frontend Setup
```bash
cd ../client
npm install
npm run dev     # UI runs at http://localhost:5173
```

### Default Login
| Email | Password |
|-------|----------|
| admin@provexa.com | admin123 |

---

## 9. Deployment Guide

### Backend on Render
1. Push repo to GitHub
2. Render → New Web Service → Connect GitHub repo
3. Root Directory: `server`
4. Build: `npm install` | Start: `npm start`
5. Environment Variables:

| Key | Value |
|-----|-------|
| DATABASE_URL | `mongodb+srv://user:pass@cluster.mongodb.net/ProvexaDB` |
| JWT_SECRET | `your_production_secret` |
| PORT | `5000` |

> ⚠️ Render's filesystem is ephemeral. For production, move signature storage to AWS S3 or Cloudinary.

### Frontend on Vercel
1. Vercel → New Project → Import GitHub repo
2. Root Directory: `client` | Framework: Vite
3. Build: `npm run build` | Output: `dist`
4. Add `client/vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

---

## 10. Testing Guide

### Manual Checklist
```
✅ Login with admin@provexa.com / admin123
✅ Add Category → Add Item → Add Employee
✅ Bulk Issue to multiple employees
✅ Status shows "Pending Acknowledgement"
✅ Click ✏️ → draw signature → submit → status = "Acknowledged"
✅ View Proof shows the saved signature image
✅ Export Excel → signature visible inside cell
✅ Green row = Acknowledged, Yellow = Pending
✅ Reset Issues → records move to archive
✅ Archived records show in Issue History
```

### API Testing with Postman
```bash
# Step 1 - Login
POST http://localhost:5000/api/auth/login
Body: { "email": "admin@provexa.com", "password": "admin123" }
→ Copy token from response

# Step 2 - Set Bearer Token in Postman Authorization tab

# Step 3 - Test endpoints
GET  http://localhost:5000/api/employees
GET  http://localhost:5000/api/items
GET  http://localhost:5000/api/issues
GET  http://localhost:5000/api/dashboard/stats
GET  http://localhost:5000/api/reports/issues?format=xlsx
```

---

## 11. GitHub Usage Guide

### Commands to Run in Terminal (Run These Manually)

```bash
# Navigate to project
cd e:\PROVEXA

# Step 1 — Initialize git (only if not done)
git init

# Step 2 — Stage all files
git add .

# Step 3 — First commit
git commit -m "Initial commit: Complete Provexa System"

# Step 4 — Add GitHub remote
git remote add origin https://github.com/Keerthana2225/PROVEXA.git

# Step 5 — Rename branch to main
git branch -M main

# Step 6 — Push to GitHub
git push -u origin main
```

### Everyday Commands
```bash
git status                              # See what changed
git add .                               # Stage all changes
git commit -m "feat: add new feature"   # Commit with message
git push                                # Push to GitHub
git pull origin main                    # Pull latest from GitHub
```

### Branching
```bash
git checkout -b feature/pdf-report      # New feature branch
git push -u origin feature/pdf-report   # Push branch to GitHub
git checkout main                       # Switch back to main
git merge feature/pdf-report            # Merge feature into main
```

### Commit Message Convention
| Prefix | When to Use |
|--------|-------------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation update |
| `style:` | UI/formatting changes |
| `refactor:` | Code restructure |

---

## 📄 License

MIT License — Built by Keerthana | Full Stack Developer

[⬆ Back to top](#-provexa--employee-asset--replacement-management-system)
