# 🛡️ PROVEXA — Employee Asset & Replacement Management System

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

---

## 📋 Table of Contents
1. [Project Overview](#1-project-overview)
2. [Exhaustive Feature List](#2-exhaustive-feature-list)
3. [Technology Stack Used](#3-technology-stack-used)
4. [Installation and Setup Instructions](#4-installation-and-setup-instructions)
5. [Folder Structure Overview](#5-folder-structure-overview)
6. [Full Project Documentation](#6-full-project-documentation)
7. [System Architecture](#7-system-architecture)
8. [Modules Description](#8-modules-description)
9. [Database Design](#9-database-design)
10. [API Documentation](#10-api-documentation)
11. [Code Workflow Explanation](#11-code-workflow-explanation)
12. [Tools and Technologies Explanation](#12-tools-and-technologies-explanation)
13. [Setup and Execution Guide](#13-setup-and-execution-guide)
14. [GitHub Usage Section](#14-github-usage-section)
15. [Conclusion](#15-conclusion)

---

## 1. Project Overview

**PROVEXA** is a professional, full-stack enterprise web application designed for HR departments, store managers, and administrators to digitally manage the complete lifecycle of employee assets. It replaces traditional paper-based asset registers with a modern, secure, and auditable digital system.

The system handles everything from issuing assets to multiple employees at once, capturing their digital signatures as proof of receipt, tracking overdue returns, managing replacement requests, and generating professional Excel and PDF reports — all in a single unified platform.

### Why PROVEXA?

In most organizations, asset distribution (uniforms, safety helmets, tools, PPE kits) is tracked in paper registers. These are easy to lose, difficult to audit, and provide no way to verify who received what and when. PROVEXA eliminates these problems by:

- Creating a permanent, tamper-proof digital record of every asset issued
- Capturing a digital signature from each employee as legal proof of receipt
- Generating branded Excel reports with actual signature images embedded in cells
- Archiving old records non-destructively so the audit trail is always intact
- Sending daily automated checks to flag overdue asset returns

### Target Users
- **HR Administrators** — Manage employees, issue assets, collect signatures
- **Store Managers** — Track item inventory, handle replacement requests
- **Compliance Officers** — Download Excel/PDF reports for audits

---

## 2. Exhaustive Feature List

### 🔐 Authentication & Security
- Secure admin login with email and password
- Passwords hashed using bcryptjs (industry-standard, irreversible)
- JWT (JSON Web Token) based stateless authentication
- Protected routes — all API endpoints require a valid Bearer token
- Token stored in localStorage; auto-attached via Axios interceptor

### 👷 Employee Management
- Add, view, and manage employee records
- Unique employee code (emp_code) per employee — prevents duplicates
- Fields: Employee Code, Full Name, Department, Designation, Status
- Search and filter employees by name or department
- Active/Inactive status management

### 📦 Item & Category Management
- Create and manage item categories (e.g., Uniforms, Safety Gear, PPE Kits)
- Add items under categories with full description
- Two scheduling modes per item:
  - **Frequency Mode**: Item is due every X days (e.g., every 365 days)
  - **Fixed Date Mode**: Item is due on a specific calendar date (e.g., 31 Dec 2025)
- Auto-calculation of next_due_date at time of issuance

### 📋 Issue Management (Core Feature)
- **Bulk Issuance**: Issue one item to multiple employees simultaneously in a single operation
- Automatic due date calculation based on item scheduling configuration
- Records created instantly with status "Pending Acknowledgement"
- View all active (non-archived) issue records in a sortable table
- Filter by employee, item, department, and date range
- Color-coded status badges (Pending = yellow, Acknowledged = green, Overdue = red)

### ✍️ Digital Signature Acknowledgement (Unique Feature)
- Two-stage workflow: Issue → Acknowledge
- Employee draws signature on a digital canvas (react-signature-canvas)
- One signature covers ALL pending items for that employee in one submission
- Signature saved as PNG file on the server filesystem
- Timestamp recorded at exact moment of signing
- "View Proof" button shows the saved signature image for any acknowledged record

### 🏛️ Archive System (Non-Destructive Reset)
- "Reset Current Issues" button archives all active issue records
- Records are NOT deleted — archived flag set to true (soft delete)
- Active dashboard only shows non-archived records
- Issue History page shows all archived records with archive reason and date
- Ensures 100% audit trail preservation across distribution cycles

### 📊 Excel Reporting (Advanced)
- Export complete issue records as styled Excel (.xlsx) file
- Header row with corporate blue background and white bold text
- Acknowledged column color-coded: Green = Acknowledged, Yellow = Pending
- Actual PNG signature image embedded inside spreadsheet cells
- Row height auto-adjusted to 130px for signature rows
- Date range and department filters applied before export
- First row frozen for easy scrolling

### 📄 PDF Reporting
- Export issue records as PDF document
- Employee name, code, department, item details, dates
- Acknowledgement status and timestamp included
- Portable format for email sharing and printing

### 🔄 Replacement Request Management
- Employees (via admin) can submit replacement requests for damaged/worn-out assets
- Request includes reason for replacement
- Admin can Approve or Reject with notes
- Status tracking: Pending → Approved / Rejected
- Resolved date and resolved-by admin recorded

### 📈 Dashboard & Analytics
- Real-time statistics: Total Employees, Total Items, Active Issues
- Pending Acknowledgements count with quick navigation
- Overdue Items alert count
- Pending Replacement Requests count
- Visual charts using Recharts

### 🕐 Automated Overdue Monitoring
- node-cron background job runs daily
- Automatically checks all active IssueRecords where next_due_date < today
- Flags overdue records — visible on dashboard and Due Tracking page

### 🌐 CORS & Network Security
- Strict CORS policy — only whitelisted origins accepted
- Supports local network IPs (192.168.x.x, 10.x.x.x) for LAN deployment
- Preflight OPTIONS requests handled for all routes

---

## 3. Technology Stack Used

### Frontend
| Technology | Version | Why Used |
|-----------|---------|----------|
| React | 18.3 | Component-based UI, virtual DOM for fast rendering |
| Vite | 5.4 | Ultra-fast build tool with Hot Module Replacement (HMR) |
| Tailwind CSS | 3.4 | Utility-first CSS — rapid, consistent styling |
| TanStack React Query | 5.99 | Server state management with auto caching and refetch |
| React Router DOM | 6.30 | Client-side routing for SPA navigation |
| Axios | 1.15 | HTTP client with interceptor support for JWT headers |
| react-signature-canvas | 1.1 | Touch/mouse digital signature capture as Base64 PNG |
| Recharts | 3.8 | Declarative charting library for dashboard analytics |
| lucide-react | 1.8 | Consistent, modern icon set |
| dayjs | 1.11 | Lightweight date formatting and manipulation |
| clsx + tailwind-merge | latest | Dynamic, conflict-free Tailwind class composition |
| class-variance-authority | 0.7 | Type-safe component variant management |

### Backend
| Technology | Version | Why Used |
|-----------|---------|----------|
| Node.js | 18+ | JavaScript runtime — same language as frontend |
| Express | 5.x | Minimalist web framework for REST API |
| MongoDB | 6+ | NoSQL document database — flexible schemas |
| Mongoose | 8.23 | MongoDB ODM with schema validation and population |
| bcryptjs | 3.0 | Secure, irreversible password hashing |
| jsonwebtoken | 9.0 | Stateless JWT generation and verification |
| ExcelJS | 4.4 | Advanced Excel generation with image embedding |
| PDFKit | 0.18 | Programmatic PDF document generation |
| node-cron | 4.2 | Cron-style scheduled background jobs |
| dayjs | 1.11 | Date arithmetic for due date calculations |
| cookie-parser | 1.4 | HTTP cookie parsing middleware |
| cors | 2.8 | Cross-Origin Resource Sharing configuration |
| dotenv | 17.4 | Environment variable loading from .env file |
| nodemon | 3.1 | Auto-restart server on file changes (dev only) |

---

## 4. Installation and Setup Instructions

### Prerequisites
| Software | Version | Download |
|---------|---------|----------|
| Node.js | v18+ | https://nodejs.org |
| MongoDB | v6+ | https://www.mongodb.com/try/download/community |
| Git | Latest | https://git-scm.com |
| VS Code | Latest | https://code.visualstudio.com (recommended) |

### Step 1 — Clone the Repository
```bash
git clone https://github.com/Keerthana2225/PROVEXA.git
cd PROVEXA
```

### Step 2 — Backend Setup
```bash
cd server
npm install
```

Create `.env` file inside `server/` folder:
```env
PORT=5000
DATABASE_URL=mongodb://localhost:27017/ProvexaDB
JWT_SECRET=your_super_secret_key_change_in_production
```

Seed the database (creates default admin account + sample data):
```bash
npm run seed
```

Start the backend development server:
```bash
npm run dev
```
Server runs at: **http://localhost:5000**

### Step 3 — Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
Frontend runs at: **http://localhost:5173**

### Default Login Credentials
| Field | Value |
|-------|-------|
| Email | admin@provexa.com |
| Password | admin123 |

---

## 5. Folder Structure Overview

```
PROVEXA/
│
├── README.md                          ← This documentation file
│
├── client/                            ← React Frontend (Vite)
│   ├── index.html                     ← HTML entry point
│   ├── vite.config.js                 ← Vite build configuration
│   ├── tailwind.config.js             ← Tailwind CSS configuration
│   ├── postcss.config.js              ← PostCSS config (required for Tailwind)
│   ├── eslint.config.js               ← ESLint code quality rules
│   ├── jsconfig.json                  ← JS path aliases
│   ├── package.json                   ← Frontend dependencies
│   │
│   └── src/
│       ├── main.jsx                   ← React root, mounts QueryClientProvider
│       ├── App.jsx                    ← Router configuration, protected routes
│       ├── index.css                  ← Global CSS, Tailwind directives
│       │
│       ├── lib/
│       │   ├── api.js                 ← Axios instance with JWT interceptor
│       │   └── utils.js               ← Helper functions (cn, formatDate)
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   └── Layout.jsx         ← Sidebar + Header wrapper
│       │   └── ui/
│       │       ├── Modal.jsx          ← Reusable modal component
│       │       ├── Toast.jsx          ← Notification toast
│       │       ├── EmployeeForm.jsx   ← Add/Edit employee form
│       │       ├── EmployeeSignatureModal.jsx  ← Signature capture modal
│       │       ├── IssueForm.jsx      ← Bulk issue form
│       │       ├── ItemForm.jsx       ← Add/Edit item form
│       │       └── ReplacementForm.jsx ← Replacement request form
│       │
│       └── pages/
│           ├── Login.jsx              ← Admin login page
│           ├── Dashboard.jsx          ← Stats + charts overview
│           ├── Employees.jsx          ← Employee CRUD
│           ├── Items.jsx              ← Item + Category management
│           ├── Issues.jsx             ← Bulk issue + signature workflow
│           ├── DueTracking.jsx        ← Overdue items tracker
│           ├── Replacements.jsx       ← Replacement request management
│           └── Reports.jsx            ← Excel/PDF download page
│
└── server/                            ← Node.js + Express Backend
    ├── index.js                       ← App entry point, server start
    ├── seed.js                        ← Database seed script
    ├── package.json                   ← Backend dependencies
    ├── .env                           ← Environment variables (not committed)
    ├── .env.example                   ← Template for .env
    │
    ├── models/                        ← Mongoose database schemas
    │   ├── Admin.js                   ← Admin user schema
    │   ├── Employee.js                ← Employee schema
    │   ├── Item.js                    ← Asset item schema
    │   ├── ItemCategory.js            ← Category lookup schema
    │   ├── IssueRecord.js             ← Core issue + archive + signature schema
    │   └── ReplacementRequest.js      ← Replacement request schema
    │
    ├── routes/                        ← Express API route handlers
    │   ├── auth.js                    ← Login, token verification
    │   ├── employees.js               ← Employee CRUD routes
    │   ├── items.js                   ← Item + Category routes
    │   ├── issues.js                  ← Issue, sign, archive routes
    │   ├── replacements.js            ← Replacement request routes
    │   ├── dashboard.js               ← Stats and analytics routes
    │   └── reports.js                 ← Excel and PDF generation routes
    │
    ├── middleware/
    │   └── auth.js                    ← JWT verification middleware
    │
    ├── jobs/
    │   └── cron.js                    ← node-cron daily overdue check
    │
    └── public/
        └── signatures/                ← PNG signature files stored here
            └── sig_*.png
```

---

## 6. Full Project Documentation

### Introduction

PROVEXA is developed to solve a real-world problem faced by organizations that distribute physical assets to employees. The name "PROVEXA" reflects its core purpose: **Proven Excellence in Asset Management**. It is built using the MERN stack (MongoDB, Express, React, Node.js) with a strong focus on user experience, data integrity, and legal accountability.

### Problem Statement

Organizations that distribute uniforms, safety equipment, tools, and PPE kits face serious challenges:
- Paper registers are lost, damaged, or tampered with
- No way to prove an employee received an item
- No automated alerts for overdue returns
- Generating audit reports takes hours of manual effort
- No process for handling replacement requests

### Need for the System

- **Legal Protection**: Organizations need proof that safety equipment was issued. Digital signatures serve as legal evidence.
- **Audit Compliance**: HR and compliance departments require complete records of what was issued, to whom, and when.
- **Efficiency**: Manual paper registers require hours of data entry. PROVEXA automates the entire workflow.
- **Accountability**: Without a proper system, employees can claim they never received items. Digital signatures eliminate this ambiguity.
- **Reporting**: Management needs regular reports on asset distribution status. PROVEXA generates these in seconds.

### Objectives

1. Replace paper-based asset registers with a secure digital system
2. Implement a legally verifiable digital signature acknowledgement workflow
3. Enable bulk issuance of assets to multiple employees simultaneously
4. Automate due date tracking and overdue alerts
5. Generate professional Excel reports with embedded signature images
6. Maintain a complete, non-destructive audit trail via soft archiving
7. Provide a user-friendly dashboard with real-time analytics
8. Handle replacement requests from submission to resolution

---

## 7. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│                                                                 │
│  Browser → React Components → React Query → Axios HTTP Client  │
│                                    ↓                            │
│         JWT Token auto-attached via Axios Request Interceptor   │
└─────────────────────────────────────┬───────────────────────────┘
                                      │ HTTP REST API
                                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Node.js + Express 5)                  │
│                                                                 │
│  Request → CORS Middleware → Auth Middleware (JWT verify)       │
│                                    ↓                            │
│              Express Router → Route Handler                     │
│                                    ↓                            │
│         Mongoose Model → MongoDB Query → Response JSON          │
│                                                                 │
│  Parallel: node-cron (daily) → Overdue check → DB update       │
│  Reports:  ExcelJS / PDFKit → File Stream → Response           │
│  Uploads:  Base64 PNG → fs.writeFile → /public/signatures/     │
└─────────────────────────────────────┬───────────────────────────┘
                                      │
                                      ↓
┌─────────────────────────────────────────────────────────────────┐
│                     MONGODB DATABASE                            │
│                                                                 │
│  Collections: admins, employees, items, itemcategories,         │
│               issuerecords, replacementrequests                 │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow for Signature Acknowledgement
```
Employee draws signature on canvas (react-signature-canvas)
        ↓
Canvas exported as Base64 PNG string (data:image/png;base64,...)
        ↓
POST /api/issues/sign/:employeeId { signature: "base64..." }
        ↓
Backend strips "data:image/png;base64," prefix
        ↓
Buffer.from(base64, 'base64') → fs.writeFile → /public/signatures/sig_*.png
        ↓
IssueRecord.updateMany({ employee: id, acknowledged: false })
  → { acknowledged: true, issue_status: "Acknowledged",
      signature_path: "/public/signatures/sig_*.png",
      acknowledgement_time: new Date() }
        ↓
Frontend React Query invalidates cache → UI refreshes automatically
```

---

## 8. Modules Description

### Module 1: Authentication Module
**Files:** `server/routes/auth.js`, `server/middleware/auth.js`, `client/src/pages/Login.jsx`

This module handles all aspects of admin identity verification. When an admin submits their email and password, the backend queries the Admin collection, compares the submitted password against the stored bcrypt hash using `bcrypt.compare()`. On success, it signs a JWT token containing the admin's ID using a secret key. This token is returned to the frontend and stored in localStorage. Every subsequent request includes this token in the `Authorization: Bearer` header, which the `auth.js` middleware verifies before allowing access to protected routes.

### Module 2: Employee Management Module
**Files:** `server/routes/employees.js`, `server/models/Employee.js`, `client/src/pages/Employees.jsx`

Manages the lifecycle of employee records. Each employee is assigned a unique `emp_code` — Mongoose's `unique: true` constraint ensures no duplicates at the database level. The frontend uses a modal-based form for adding employees. React Query's `useMutation` hook handles the POST request and automatically refreshes the employee list on success via `invalidateQueries`.

### Module 3: Item & Category Module
**Files:** `server/routes/items.js`, `server/models/Item.js`, `server/models/ItemCategory.js`, `client/src/pages/Items.jsx`

A two-tier hierarchy: Categories contain Items. Each Item has a scheduling mode — either frequency-based (X days) or fixed-date based. This scheduling information is used at issuance time to automatically calculate when the item must be returned. The frontend allows toggling between modes and previews the calculated due date.

### Module 4: Issue Management Module (Core)
**Files:** `server/routes/issues.js`, `server/models/IssueRecord.js`, `client/src/pages/Issues.jsx`

The heart of PROVEXA. This module handles:
- **Bulk Issuance**: A single API call creates multiple IssueRecord documents, one per employee-item pair
- **Status Tracking**: Records progress through "Pending Acknowledgement" → "Acknowledged"
- **Archive/Reset**: POST to `/archive` sets `archived: true` on all active records (soft delete)
- **Signature Collection**: POST to `/sign/:employeeId` saves PNG and updates all pending records for that employee

### Module 5: Digital Signature Module
**Files:** `server/routes/issues.js` (sign endpoint), `client/src/components/ui/EmployeeSignatureModal.jsx`

Uses `react-signature-canvas` to render a drawing canvas. When submitted, the canvas calls `.toDataURL('image/png')` to export the drawing as a Base64 string. The backend receives this, converts it to a binary Buffer, and writes it to disk as a PNG file. The file path is stored in the IssueRecord.

### Module 6: Reporting Module
**Files:** `server/routes/reports.js`, `client/src/pages/Reports.jsx`

Two export formats:
- **Excel (ExcelJS)**: Styled workbook with corporate header, conditional cell coloring, and embedded PNG images for signatures. Uses `worksheet.addImage()` with pixel-exact coordinates.
- **PDF (PDFKit)**: Streamed PDF document with employee and item details, issued/due dates, and acknowledgement status.

### Module 7: Replacement Request Module
**Files:** `server/routes/replacements.js`, `server/models/ReplacementRequest.js`, `client/src/pages/Replacements.jsx`

Employees (through the admin interface) can request replacements for damaged assets. Requests start as "pending" and are either "approved" or "rejected" by the admin with optional notes. All state transitions are recorded with timestamps and the resolving admin's ID.

### Module 8: Dashboard & Due Tracking Module
**Files:** `server/routes/dashboard.js`, `client/src/pages/Dashboard.jsx`, `client/src/pages/DueTracking.jsx`, `server/jobs/cron.js`

The dashboard aggregates counts from all collections in a single API call. The Due Tracking page specifically shows records where `next_due_date` is in the past and `archived: false`. The `node-cron` job runs at midnight daily to update any newly overdue records.

---

## 9. Database Design

### Entity Relationship Diagram
```
ItemCategory (1) ──────────────< Item (many)
                                   │
                                   │ (item ref)
                                   ▼
Admin (1) >──────── IssueRecord (many) ──────────< Employee (1)
  │ (issued_by)         │
  │ (archived_by)       │ signature_path → /public/signatures/*.png
  │                     │ archived: Boolean
  │                     │ acknowledged: Boolean
  │
  └──── ReplacementRequest (many) ──────────────< Employee (1)
                                  │
                                  └── (item ref) → Item
```

### Collection: `admins`
```json
{
  "_id": "ObjectId",
  "name": "Admin",
  "email": "admin@provexa.com",
  "password_hash": "$2b$10$...",
  "created_at": "ISODate"
}
```

### Collection: `employees`
```json
{
  "_id": "ObjectId",
  "emp_code": "EMP001",
  "name": "Ravi Kumar",
  "department": "Security",
  "designation": "Guard",
  "status": "active",
  "created_at": "ISODate"
}
```

### Collection: `itemcategories`
```json
{
  "_id": "ObjectId",
  "name": "Safety Gear"
}
```

### Collection: `items`
```json
{
  "_id": "ObjectId",
  "name": "Safety Helmet",
  "category": "ObjectId → itemcategories",
  "frequency_days": 365,
  "fixed_date": null,
  "description": "ISI certified hard hat"
}
```

### Collection: `issuerecords` (Core)
```json
{
  "_id": "ObjectId",
  "employee": "ObjectId → employees",
  "employee_name": "Ravi Kumar",
  "item": "ObjectId → items",
  "item_name": "Safety Helmet",
  "issued_date": "ISODate",
  "next_due_date": "ISODate",
  "quantity": 1,
  "issued_by": "ObjectId → admins",
  "issue_status": "Acknowledged",
  "signature_path": "/public/signatures/sig_1714567890_emp001.png",
  "acknowledged": true,
  "acknowledgement_time": "ISODate",
  "notes": "",
  "archived": false,
  "archived_at": null,
  "archived_by": null,
  "archive_reason": null,
  "created_at": "ISODate"
}
```

### Collection: `replacementrequests`
```json
{
  "_id": "ObjectId",
  "employee": "ObjectId → employees",
  "employee_name": "Ravi Kumar",
  "item": "ObjectId → items",
  "item_name": "Safety Helmet",
  "reason": "Helmet cracked during site incident",
  "status": "approved",
  "requested_date": "ISODate",
  "resolved_date": "ISODate",
  "resolved_by": "ObjectId → admins",
  "notes": "New helmet issued from store"
}
```

---

## 10. API Documentation

> **Base URL:** `http://localhost:5000`
> **Authentication:** All endpoints except `/api/auth/login` require:
> `Authorization: Bearer <your_jwt_token>`

### Authentication

**POST** `/api/auth/login`
```
Request Body:
{ "email": "admin@provexa.com", "password": "admin123" }

Success (200):
{ "token": "eyJhbGci...", "admin": { "id": "...", "name": "Admin", "email": "admin@provexa.com" } }

Error (401):
{ "message": "Invalid credentials" }
```

**GET** `/api/auth/me`
```
Response (200):
{ "id": "...", "name": "Admin", "email": "admin@provexa.com" }
```

### Employees

**GET** `/api/employees`
```
Response (200): Array of all employees
[{ "id":"...", "emp_code":"EMP001", "name":"Ravi Kumar", "department":"Security", "designation":"Guard", "status":"active" }]
```

**POST** `/api/employees`
```
Request: { "emp_code":"EMP010", "name":"Anitha", "department":"HR", "designation":"Executive" }
Response (201): Created employee object
Error (400): { "message": "Employee code already exists" }
```

### Categories

**GET** `/api/categories`
```
Response: [{ "id":"...", "name":"Safety Gear" }, { "id":"...", "name":"Uniforms" }]
```

**POST** `/api/categories`
```
Request: { "name": "PPE Kits" }
Response (201): Created category object
```

### Items

**GET** `/api/items`
```
Response: [{ "id":"...", "name":"Safety Helmet", "category":{"id":"...","name":"Safety Gear"}, "frequency_days":365, "fixed_date":null }]
```

**POST** `/api/items`
```
Frequency Mode: { "name":"Work Shirt", "category":"cat_id", "frequency_days":180 }
Fixed Date Mode: { "name":"Annual Jacket", "category":"cat_id", "fixed_date":"2025-12-31" }
Response (201): Created item object
```

### Issue Records

**GET** `/api/issues`
```
Response: All active (non-archived) issue records with populated employee and item fields
```

**POST** `/api/issues` — Bulk Issue
```
Request:
{
  "items": [
    { "employee_id":"...", "item_id":"...", "issued_date":"2025-05-01", "next_due_date":"2026-05-01", "quantity":1, "notes":"Annual issue" },
    { "employee_id":"...", "item_id":"...", "issued_date":"2025-05-01", "next_due_date":"2026-05-01", "quantity":1 }
  ]
}
Response (201): { "message": "2 records created successfully" }
```

**POST** `/api/issues/sign/:employeeId` — Collect Digital Signature
```
Request: { "signature": "data:image/png;base64,iVBORw0KGgo..." }
Response (200): { "message": "Signature saved. 3 records acknowledged.", "signature_path": "/public/signatures/sig_*.png" }
```

**POST** `/api/issues/archive` — Archive All Active Issues
```
Request: { "archive_reason": "Annual cycle reset FY 2025-26" }
Response (200): { "message": "42 records archived successfully." }
```

### Replacements

**GET** `/api/replacements`
```
Response: All replacement requests with employee and item details
```

**POST** `/api/replacements`
```
Request: { "employee_id":"...", "item_id":"...", "reason":"Helmet cracked" }
Response (201): Created replacement request
```

**PATCH** `/api/replacements/:id`
```
Request: { "status":"approved", "notes":"New helmet issued from store." }
Response (200): Updated replacement request
```

### Dashboard

**GET** `/api/dashboard/stats`
```
Response:
{
  "totalEmployees": 45,
  "totalItems": 12,
  "totalActiveIssues": 120,
  "pendingAcknowledgements": 8,
  "overdueItems": 5,
  "pendingReplacements": 2
}
```

### Reports

**GET** `/api/reports/issues?format=xlsx`
```
Query Params:
  format = xlsx | pdf
  startDate = YYYY-MM-DD (optional)
  endDate = YYYY-MM-DD (optional)
  department = "Security" (optional)

Response: File download stream
  - Excel: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  - PDF: application/pdf
```

---

## 11. Code Workflow Explanation

### Server Startup (`server/index.js`)
1. `dotenv.config()` loads `.env` variables into `process.env`
2. Global Mongoose plugin registered — transforms `_id` to `id` in all JSON responses, removes `__v`
3. All route files imported and registered under `/api/*`
4. `node-cron` job imported (auto-starts the scheduler)
5. `mongoose.connect()` establishes MongoDB connection
6. `app.listen()` starts the Express server on PORT 5000

### How JWT Authentication Works
```
1. POST /api/auth/login
   → Admin.findOne({ email }) → bcrypt.compare(password, hash)
   → jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '7d' })
   → Returns token to client

2. Frontend stores token in localStorage

3. Axios interceptor (client/src/lib/api.js):
   → Before every request: config.headers.Authorization = "Bearer " + token

4. Backend middleware (server/middleware/auth.js):
   → jwt.verify(token, JWT_SECRET) → sets req.admin = decoded payload
   → If invalid/expired → 401 Unauthorized
```

### How Bulk Issue Works
```
1. Admin selects employees + item in IssueForm modal
2. Frontend sends POST /api/issues with array of records
3. Backend loops through array:
   - Creates IssueRecord for each employee-item pair
   - Stores employee_name and item_name for readability in MongoDB Compass
   - Sets issue_status: "Pending Acknowledgement", acknowledged: false
4. React Query invalidates "issues" cache → table refreshes
```

### How Signature Capture Works
```
1. Admin clicks ✏️ icon for an employee
2. EmployeeSignatureModal opens with react-signature-canvas
3. Employee draws signature on canvas
4. Admin clicks Submit
5. signatureCanvasRef.current.toDataURL('image/png') → Base64 string
6. POST /api/issues/sign/:employeeId { signature: "data:image/png;base64,..." }
7. Backend:
   a. Strips "data:image/png;base64," prefix
   b. Buffer.from(base64str, 'base64')
   c. fs.writeFileSync(path.join(__dirname, '../public/signatures', filename), buffer)
   d. IssueRecord.updateMany(
        { employee: employeeId, acknowledged: false, archived: false },
        { $set: { acknowledged: true, issue_status: "Acknowledged",
                  signature_path: filePath, acknowledgement_time: new Date() }}
      )
8. Response sent → React Query invalidates cache → rows turn green
```

### How Excel Report Generation Works
```
1. GET /api/reports/issues?format=xlsx
2. IssueRecord.find({ archived: false }).populate('employee').populate({ path:'item', populate:'category' })
3. ExcelJS.Workbook created
4. Columns defined with headers, keys, widths
5. Header row styled: bold white text, corporate blue background (#3B4A9A)
6. For each issue record:
   a. Row added with employee, item, dates, status data
   b. Row height = 130px if has signature, 22px otherwise
   c. Acknowledged cell: green fill if acknowledged, yellow if not
   d. If signature_path exists:
      - workbook.addImage({ filename: sigFilePath, extension: 'png' })
      - worksheet.addImage(imageId, { tl: {col:13, row:rowIndex-1}, ext:{width:320,height:110} })
7. worksheet.views = [{ state:'frozen', ySplit:1 }]
8. res.setHeader('Content-Type', '...xlsx')
9. workbook.xlsx.write(res) → streams file to browser → download starts
```

### How Archive (Soft Delete) Works
```
1. Admin clicks "Reset Current Issues" button
2. Frontend shows confirmation dialog with reason input
3. POST /api/issues/archive { archive_reason: "Annual reset" }
4. Backend:
   IssueRecord.updateMany(
     { archived: false },
     { $set: { archived: true, archived_at: new Date(),
               archived_by: req.admin.id, archive_reason: reason }}
   )
5. Active issues view (GET /api/issues) only queries { archived: false }
6. Issue History view queries { archived: true }
7. Zero data lost — complete audit trail preserved
```

---

## 12. Tools and Technologies Explanation

### React 18
React is a JavaScript library for building user interfaces using a component-based architecture. Each UI element (table row, modal, form) is an isolated, reusable component. React's virtual DOM efficiently updates only the parts of the screen that changed, making it very fast. We use React 18 which includes automatic batching and concurrent features.

### Vite
Vite is a modern frontend build tool that replaces webpack. It uses native ES modules in the browser during development, making the dev server start in under a second. When building for production, it uses Rollup to bundle and optimize all files. The `npm run dev` command starts the Vite dev server with Hot Module Replacement (HMR) — changes appear in the browser instantly without a full page reload.

### TanStack React Query
React Query is a server state management library. Instead of managing loading/error/data states manually with useState and useEffect, React Query provides `useQuery` and `useMutation` hooks. It automatically caches API responses, refetches stale data in the background, and provides loading and error states. When we call `invalidateQueries('issues')` after a mutation, React Query automatically refetches the issues list and updates the UI.

### Tailwind CSS
Tailwind is a utility-first CSS framework. Instead of writing custom CSS classes, you apply pre-defined utilities directly in JSX: `className="flex items-center bg-blue-600 text-white rounded-lg px-4 py-2"`. This approach eliminates the need for separate CSS files for most components. PostCSS and Autoprefixer work behind the scenes to process Tailwind's directives.

### react-signature-canvas
This library renders an HTML5 Canvas element that responds to mouse and touch events, allowing users to draw freehand. The `.toDataURL('image/png')` method exports the canvas content as a Base64-encoded PNG string, which can be transmitted via HTTP and stored as an image file.

### Mongoose
Mongoose is an Object Document Mapper (ODM) for MongoDB. It adds schema validation, type casting, middleware (pre/post hooks), and population (joining documents across collections) on top of the MongoDB driver. The `ref` field in schemas enables `.populate()` to replace ObjectId references with the actual document data.

### bcryptjs
bcryptjs implements the bcrypt password hashing algorithm. It is computationally expensive by design — this makes brute-force attacks impractical. `bcrypt.hash(password, 10)` creates a salted hash with 10 rounds of processing. `bcrypt.compare(plaintext, hash)` verifies passwords without ever decrypting the hash.

### JSON Web Tokens (JWT)
JWT is an open standard for creating access tokens. A token consists of three Base64-encoded parts: Header (algorithm), Payload (claims like user ID and expiry), and Signature. The server signs tokens with a secret key. Any tampering with the payload invalidates the signature, making JWTs secure for authentication.

### ExcelJS
ExcelJS is a Node.js library for creating and manipulating Excel files (.xlsx). Unlike the simpler `xlsx` library, ExcelJS supports image embedding, cell-level styling, merged cells, and streaming writes. It was chosen specifically because it can embed PNG images directly into spreadsheet cells — a critical requirement for the signature report.

### PDFKit
PDFKit is a JavaScript library for generating PDF documents programmatically. It supports text, images, shapes, and multi-page documents. PDFKit pipes the output as a stream directly to the HTTP response, so the PDF is generated and downloaded simultaneously without storing it on disk.

### node-cron
node-cron is a task scheduler for Node.js that uses cron syntax. The expression `0 0 * * *` means "run at midnight every day". This is used to automatically check for overdue IssueRecords (where `next_due_date < today`) and update their status without any admin intervention.

### dotenv
dotenv loads environment variables from a `.env` file into `process.env`. This allows sensitive configuration (database URL, JWT secret) to be kept out of source code. The `.env` file is listed in `.gitignore` so it is never committed to GitHub.

---

## 13. Setup and Execution Guide

### Development Mode (Full Stack)

**Terminal 1 — Backend:**
```bash
cd e:\PROVEXA\server
npm install
# Create .env file with your config
npm run seed          # Seeds DB with admin and sample data
npm run dev           # Starts nodemon on port 5000
```

**Terminal 2 — Frontend:**
```bash
cd e:\PROVEXA\client
npm install
npm run dev           # Starts Vite on port 5173
```

Open browser: **http://localhost:5173**

### Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| PORT | Backend server port | 5000 |
| DATABASE_URL | MongoDB connection string | mongodb://localhost:27017/ProvexaDB |
| JWT_SECRET | Secret key for JWT signing | any_long_random_string |

### Available npm Scripts

**Backend (server/):**
| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (auto-restart on changes) |
| `npm start` | Start without nodemon (production) |
| `npm run seed` | Clear DB and create admin + sample data |

**Frontend (client/):**
| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Build production bundle to /dist |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint checks |

### Testing the API

Using curl:
```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@provexa.com","password":"admin123"}'

# Get employees (replace TOKEN with actual token)
curl http://localhost:5000/api/employees \
  -H "Authorization: Bearer TOKEN"
```

---

## 14. GitHub Usage Section

### Initial Push (Run These Commands Manually in Terminal)

```bash
# 1. Navigate to project root
cd e:\PROVEXA

# 2. Initialize git repository
git init

# 3. Stage all files
git add .

# 4. Create your first commit
git commit -m "Initial commit: Complete Provexa System"

# 5. Add GitHub remote repository
git remote add origin https://github.com/Keerthana2225/PROVEXA.git

# 6. Rename branch to main
git branch -M main

# 7. Push to GitHub
git push -u origin main
```

### Daily Development Commands

```bash
# Check which files have changed
git status

# See what exactly changed in files
git diff

# Stage all changes
git add .

# Stage a specific file only
git add server/routes/issues.js

# Commit with message
git commit -m "feat: add bulk issue validation"

# Push to GitHub
git push

# Pull latest changes from GitHub
git pull origin main
```

### Branching Workflow

```bash
# Create new branch for a feature
git checkout -b feature/pdf-watermark

# See all branches
git branch

# Push the new branch to GitHub
git push -u origin feature/pdf-watermark

# After feature is complete — switch back to main
git checkout main

# Merge feature into main
git merge feature/pdf-watermark

# Delete the feature branch (cleanup)
git branch -d feature/pdf-watermark
```

### Undoing Mistakes

```bash
# Undo changes to a file (before staging)
git checkout -- server/routes/issues.js

# Unstage a file (after git add, before commit)
git reset HEAD server/routes/issues.js

# Undo last commit (keeps changes in working directory)
git reset --soft HEAD~1

# View commit history
git log --oneline -10
```

### Commit Message Best Practices

| Prefix | Use When |
|--------|----------|
| `feat:` | Adding a new feature |
| `fix:` | Fixing a bug |
| `docs:` | Documentation changes |
| `style:` | UI styling changes |
| `refactor:` | Code restructuring |
| `chore:` | Dependency updates, config |

**Examples:**
```bash
git commit -m "feat: add digital signature to issue acknowledgement"
git commit -m "fix: resolve duplicate emp_code validation error"
git commit -m "docs: update API documentation in README"
git commit -m "style: improve dashboard card hover animations"
```

### .gitignore (Already configured)
The project already has `.gitignore` files that exclude:
- `node_modules/` — reinstalled via npm install
- `.env` — contains secrets, never commit this
- `dist/` — built files, regenerated by npm run build

---

## 15. Conclusion

PROVEXA is a complete, production-ready enterprise asset management system that demonstrates proficiency across the full web development stack:

**Technical Skills Demonstrated:**
- Full-stack JavaScript development (React + Node.js)
- NoSQL database design with relational patterns (MongoDB + Mongoose)
- Secure stateless authentication (JWT + bcrypt)
- Advanced file processing (ExcelJS with image embedding, PDFKit)
- Digital signature capture and storage workflow
- Background job scheduling (node-cron)
- RESTful API design with proper HTTP status codes
- Server state management with React Query
- Utility-first CSS design with Tailwind
- Non-destructive data management (soft delete / archive pattern)

**Real-World Problems Solved:**
- Eliminated paper-based asset registers
- Created legally verifiable digital proof of asset handover
- Automated overdue return tracking
- Generated professional reports with embedded signature images
- Preserved complete audit trails through non-destructive archiving

**Future Enhancements:**
- Employee self-service portal
- Mobile app for field workers
- AWS S3 integration for signature storage (cloud deployment)
- Email notifications for overdue assets
- Multi-tenant support for multiple organizations
- Barcode/QR code scanning for asset identification

---

<div align="center">
  <p>Built with dedication by <strong>Keerthana</strong> | Full Stack Developer</p>
  <a href="https://github.com/Keerthana2225">GitHub Profile</a>
</div>
