# 🛡️ PROVEXA — Employee Asset & Replacement Management System

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

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

**PROVEXA** is a full-stack enterprise web application built to digitally manage the complete lifecycle of employee assets. Organizations — especially those in manufacturing, construction, security, and hospitality — distribute physical items like uniforms, safety helmets, PPE kits, and tools to their employees. Traditionally this is tracked using paper registers which are easy to lose, impossible to audit, and offer no proof of handover.

PROVEXA replaces all of that with a professional, secure, web-based system that:
- Records every single asset issued to every employee
- Captures a legal digital signature from each employee as proof of receipt
- Tracks when items are due for return or renewal
- Manages replacement requests when items are damaged
- Generates styled Excel reports — with actual signature images inside the spreadsheet cells

### Who Uses It?
| Role | What They Do |
|------|-------------|
| HR Administrator | Issues assets, collects signatures, manages employees |
| Store Manager | Manages item inventory, handles replacement requests |
| Compliance Officer | Downloads Excel/PDF reports for audits and legal records |

### For Interviews — One Paragraph Summary
> "PROVEXA is a MERN-stack enterprise application that digitises employee asset management. The most technically complex feature is the two-stage digital signature workflow — the admin bulk-issues assets, the employee draws a signature on a digital canvas, and the backend converts that canvas drawing from Base64 to a real PNG image file stored on the server. That image path is then saved in MongoDB, and when generating the Excel report with ExcelJS, the actual PNG image is embedded directly inside the spreadsheet cells. Records are never deleted — they are soft-archived with a reason and timestamp, preserving a complete audit trail."

---

## 2. Exhaustive Feature List

### 🔐 Authentication & Security
- Secure admin login with email and password
- Password stored as a bcrypt hash — original password is never saved anywhere
- JWT (JSON Web Token) issued on login, stored in an **HTTP-only cookie** (not localStorage — more secure, not accessible by JavaScript)
- Every API route protected — request without a valid cookie is rejected with 401 Unauthorized
- Cookie expires automatically after 24 hours

### 👷 Employee Management
- Add employees with: Employee Code (unique), Full Name, Department, Designation
- Unique employee code enforced at database level — no duplicates possible
- Status field: `active` or `inactive`
- View all employees in a searchable table

### 📦 Item & Category Management
- Create item categories: e.g., "Uniforms", "Safety Gear", "PPE Kits", "Tools"
- Create items under categories with optional description
- **Two scheduling modes** per item:
  - **Frequency Mode**: Enter a number of days (e.g., 365) → item due every year from issue date
  - **Fixed Date Mode**: Enter a specific date (e.g., 31-Dec-2025) → same due date for everyone

### 📋 Issue Management (Core)
- Issue one or more items to one or more employees in a **single bulk operation**
- Duplicate check: warns if an employee already has an active record for the same item
- Auto-calculates `next_due_date` from the item's scheduling configuration
- Records saved with status `Pending Acknowledgement`
- Filter issues by: employee, item, status (overdue / pending / acknowledged), date range
- Color-coded status: yellow = Pending, green = Acknowledged, red = Overdue

### ✍️ Digital Signature Acknowledgement (Unique Feature)
- Employee draws signature on a digital canvas pad
- **One signature covers ALL pending items** for that employee simultaneously
- Signature saved as a real PNG image file on the server
- Timestamp recorded at the exact moment of signing
- "View Proof" button displays the saved signature for any acknowledged record
- Individual record acknowledgement also supported

### 🏛️ Archive System — Soft Delete (Non-Destructive Reset)
- "Reset Current Issues" button allows admin to archive records:
  - All records → `scope: 'all'`
  - Records for one employee → `scope: 'employee'`
  - Specific selected records → `scope: 'selected'`
- Archived records are **never deleted** — the `archived` flag is set to `true`
- Active view shows only `archived: false` records
- Issue History view shows all `archived: true` records
- Archive reason, timestamp, and the admin who archived are all saved

### 📊 Advanced Excel Reporting (ExcelJS)
- Export all issue records as a styled `.xlsx` file
- Header row: corporate blue background, white bold text
- `Acknowledged` column: green fill = Yes, yellow fill = No
- Actual PNG signature image embedded inside the spreadsheet cell
- Row height: 130px for rows with signatures, 22px for rows without
- Date range and department filters supported before export
- First row frozen for easy scrolling through large datasets

### 📄 PDF Reporting (PDFKit)
- Export issue records as a PDF document
- Employee name, code, department, item, issued date, due date, status
- Portable format for email sharing, printing, or filing

### 🔄 Replacement Request Management
- Admin submits a replacement request on behalf of an employee
- Includes reason: e.g., "Helmet cracked in site incident"
- Admin can Approve or Reject with notes
- Status flow: `pending` → `approved` / `rejected`
- Resolved date and which admin resolved it — both saved

### 📈 Dashboard & Analytics
- Active employee count
- Items issued this month
- Items due in next 7 days (early warning)
- Overdue items count (past due date)
- Pending replacement requests count
- Bar chart showing issue activity over last 6 months (Recharts)

### 🕐 Automated Overdue Monitoring (node-cron)
- Background scheduler runs **every day at 8:00 AM** automatically
- Queries all IssueRecords where `next_due_date < today`
- Logs overdue items to console (can be extended to send email/SMS alerts)
- Runs without any admin action — completely automatic

### 🌐 Network & Security
- CORS configured to allow specific origins only (localhost + local network IPs)
- Supports LAN deployment: 192.168.x.x, 10.x.x.x addresses allowed
- HTTP-only cookie prevents XSS token theft
- `sameSite: strict` prevents CSRF attacks

---

## 3. Technology Stack Used

### Why MERN Stack?
MERN stands for MongoDB, Express, React, Node.js. All components use JavaScript — the same language on both frontend and backend. This means:
- No context switching between languages
- Shared data structures (JSON) work identically everywhere
- Large community and ecosystem of libraries

### Frontend Technologies

| Technology | Version | What It Is | Why We Use It |
|-----------|---------|-----------|---------------|
| **React** | 18.3 | JavaScript library for building user interfaces | Lets us build interactive UI from small reusable pieces called components |
| **Vite** | 5.4 | Frontend build tool | Starts the dev server in under 1 second; much faster than older tools like webpack |
| **Tailwind CSS** | 3.4 | CSS framework | Pre-built style classes applied directly in HTML/JSX — no need to write custom CSS |
| **TanStack React Query** | 5.99 | Server state management library | Handles all API calls, caching, loading states, and auto-refresh automatically |
| **React Router DOM** | 6.30 | Client-side routing | Allows navigation between pages without full page reload |
| **Axios** | 1.15 | HTTP client | Sends API requests to backend; has interceptors to auto-attach cookies |
| **react-signature-canvas** | 1.1 | Signature drawing library | Renders a canvas where user can draw; exports as Base64 PNG |
| **Recharts** | 3.8 | Charting library | Draws the bar charts on the dashboard |
| **lucide-react** | 1.8 | Icon library | Clean, consistent icons throughout the UI |
| **dayjs** | 1.11 | Date utility library | Formats and calculates dates (much smaller than moment.js) |
| **clsx + tailwind-merge** | latest | CSS class utilities | Safely combines Tailwind classes without conflicts |

### Backend Technologies

| Technology | Version | What It Is | Why We Use It |
|-----------|---------|-----------|---------------|
| **Node.js** | 18+ | JavaScript runtime for server | Run JavaScript outside the browser on the server |
| **Express** | 5.x | Web framework for Node.js | Handles incoming HTTP requests and routes them to the right handler |
| **MongoDB** | 6+ | NoSQL document database | Stores data as JSON-like documents; flexible, no rigid table structure |
| **Mongoose** | 8.23 | MongoDB ODM (Object Document Mapper) | Adds schema validation, type checking, and relationship linking on top of MongoDB |
| **bcryptjs** | 3.0 | Password hashing library | Converts passwords to irreversible hashes — even we cannot recover the original |
| **jsonwebtoken** | 9.0 | JWT library | Creates and verifies secure login tokens |
| **cookie-parser** | 1.4 | Cookie reading middleware | Parses HTTP cookies so we can read the JWT token from requests |
| **ExcelJS** | 4.4 | Excel file generator | Creates `.xlsx` files with styling and image embedding |
| **PDFKit** | 0.18 | PDF generator | Creates PDF documents programmatically |
| **node-cron** | 4.2 | Task scheduler | Runs background jobs on a schedule (like "every day at 8 AM") |
| **dayjs** | 1.11 | Date utility | Calculates due dates and formats timestamps |
| **cors** | 2.8 | CORS middleware | Controls which websites are allowed to call our API |
| **dotenv** | 17.4 | Environment variable loader | Reads secret keys from `.env` file so they stay out of the code |
| **nodemon** | 3.1 | Dev auto-restart | Automatically restarts the server when we save a file (dev only) |

> ⚠️ **Note about Prisma**: You will see a `prisma/` folder and `prisma.config.ts` file in older versions of this project. These were from an early prototype and are **NOT used** in the application. The actual database layer uses **Mongoose only**. Those Prisma files have been removed.

---

## 4. Installation and Setup Instructions

### Prerequisites — Install These First
| Software | Why You Need It | Download |
|---------|----------------|----------|
| Node.js v18+ | Runs the backend server and frontend build tool | https://nodejs.org |
| MongoDB Community | The database where all data is stored | https://www.mongodb.com/try/download/community |
| Git | Version control — used to clone and push code | https://git-scm.com |

### Step 1 — Clone the Repository
```bash
git clone https://github.com/Keerthana2225/PROVEXA.git
cd PROVEXA
```

### Step 2 — Set Up the Backend (Server)
```bash
cd server
npm install
```

Now create a file called `.env` inside the `server/` folder and paste this:
```env
PORT=5000
DATABASE_URL=mongodb://localhost:27017/ProvexaDB
JWT_SECRET=any_long_random_secret_string_here
```

What these mean:
- `PORT=5000` → The backend server will run on port 5000
- `DATABASE_URL` → Where MongoDB is running and the name of the database (ProvexaDB)
- `JWT_SECRET` → A secret key used to sign login tokens. Keep this private.

Seed the database (this clears the database and creates a fresh admin account):
```bash
npm run seed
```

Start the backend:
```bash
npm run dev
```
✅ Server is now running at: **http://localhost:5000**

### Step 3 — Set Up the Frontend (Client)
Open a **second terminal window** and run:
```bash
cd client
npm install
npm run dev
```
✅ Frontend is now running at: **http://localhost:5173**

Open your browser and go to: **http://localhost:5173**

### Default Login
| Email | Password |
|-------|----------|
| admin@provexa.com | admin123 |

---

## 5. Folder Structure Overview

```
PROVEXA/
│
├── README.md                           ← This documentation file
│
├── client/                             ← Everything the user SEES (Frontend)
│   ├── index.html                      ← The single HTML page (React loads inside here)
│   ├── vite.config.js                  ← Vite configuration: port, plugins, path aliases
│   ├── tailwind.config.js              ← Tailwind: custom colors, fonts, screen sizes
│   ├── postcss.config.js               ← PostCSS: required to process Tailwind CSS
│   ├── eslint.config.js                ← Code quality rules (catches common mistakes)
│   ├── jsconfig.json                   ← Tells VS Code about path aliases (@/ = src/)
│   ├── package.json                    ← List of all frontend libraries and npm scripts
│   │
│   └── src/
│       ├── main.jsx                    ← Entry point: mounts React app, sets up React Query
│       ├── App.jsx                     ← Defines all routes (which URL shows which page)
│       ├── index.css                   ← Global CSS and Tailwind @tailwind directives
│       │
│       ├── lib/
│       │   ├── api.js                  ← Axios instance with base URL and credentials config
│       │   └── utils.js                ← Helper functions: cn() for class merging, date formatters
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   └── Layout.jsx          ← Sidebar navigation + top header wrapper
│       │   └── ui/
│       │       ├── Modal.jsx           ← Reusable popup/dialog component
│       │       ├── Toast.jsx           ← Success/Error notification that appears briefly
│       │       ├── EmployeeForm.jsx    ← Form to add/edit an employee
│       │       ├── EmployeeSignatureModal.jsx  ← The digital signature capture popup
│       │       ├── IssueForm.jsx       ← Bulk issue form: select employees + items
│       │       ├── ItemForm.jsx        ← Form to add/edit an item
│       │       └── ReplacementForm.jsx ← Form to submit a replacement request
│       │
│       └── pages/
│           ├── Login.jsx               ← Login page with email/password form
│           ├── Dashboard.jsx           ← Home: statistics cards + bar chart
│           ├── Employees.jsx           ← Employee list + add/edit
│           ├── Items.jsx               ← Item categories + items management
│           ├── Issues.jsx              ← Issue records table + bulk issue + signature
│           ├── DueTracking.jsx         ← Overdue / due soon items tracker
│           ├── Replacements.jsx        ← Replacement requests management
│           └── Reports.jsx             ← Download Excel / PDF reports
│
└── server/                             ← Everything that runs on the SERVER (Backend)
    ├── index.js                        ← App entry: MongoDB connect, middleware, routes, start
    ├── seed.js                         ← Script to populate DB with admin + sample data
    ├── package.json                    ← Backend libraries and scripts
    ├── .env                            ← Secret config (NEVER commit this to GitHub)
    ├── .env.example                    ← Template showing what .env should look like
    │
    ├── models/                         ← Database table definitions (called Schemas in MongoDB)
    │   ├── Admin.js                    ← Admin user: name, email, password_hash
    │   ├── Employee.js                 ← Employee: emp_code, name, dept, designation
    │   ├── Item.js                     ← Asset item: name, category, frequency_days, fixed_date
    │   ├── ItemCategory.js             ← Category: just a name (e.g. "Uniforms")
    │   ├── IssueRecord.js              ← Core: links employee+item, tracks signature+archive
    │   └── ReplacementRequest.js       ← Replacement: employee+item+reason+status
    │
    ├── routes/                         ← API endpoints — URLs the frontend calls
    │   ├── auth.js                     ← POST /login, POST /logout, GET /me
    │   ├── employees.js                ← GET / POST employees
    │   ├── items.js                    ← GET / POST items and categories
    │   ├── issues.js                   ← GET / POST issues, PUT acknowledge, PUT archive-reset
    │   ├── replacements.js             ← GET / POST / PATCH replacements
    │   ├── dashboard.js                ← GET /stats, GET /chart-data
    │   └── reports.js                  ← GET /issues?format=xlsx or pdf
    │
    ├── middleware/
    │   └── auth.js                     ← Checks every request for a valid login cookie
    │
    ├── jobs/
    │   └── cron.js                     ← Runs at 8 AM daily — checks for overdue items
    │
    └── public/
        └── signatures/                 ← PNG signature image files saved here
            └── sig_emp_*.png
            └── sig_rec_*.png
```

---

## 6. Full Project Documentation

### Introduction
PROVEXA was built to solve a real and common problem in organizations that distribute physical assets to employees. Traditional paper-based systems are unreliable, difficult to audit, and provide no legal proof of handover. This system creates a fully digital, auditable, and legally verifiable asset management workflow.

### Problem Statement
Organizations that distribute uniforms, safety gear, and tools face these issues every day:
1. Paper registers get lost, damaged, or tampered with
2. There is no proof that a specific employee received a specific item
3. No automated system to know when items are overdue for return
4. Generating reports takes hours of manual data entry
5. When an item is damaged, there is no formal process to request a replacement
6. After a distribution cycle ends, old data cannot be deleted (auditors need it) but also cannot stay visible alongside new data

### Need for the System
- **Legal Proof**: In industries governed by safety regulations (factories, construction sites), employers must prove safety equipment was issued. A digital signature on record serves as legal evidence.
- **Audit Readiness**: Compliance audits require complete records. PROVEXA generates detailed reports in seconds.
- **Efficiency**: One admin can bulk-issue assets to 50 employees in a few clicks instead of hours of paperwork.
- **Accountability**: With digital signatures, employees cannot claim they never received items.
- **Archive vs Delete**: You cannot delete records (auditors need old data), but you also need a clean workspace for new cycles. The archive system solves this perfectly.

### Objectives
1. Replace paper registers with a secure digital system
2. Implement a two-stage digital acknowledgement workflow with legal signature capture
3. Enable bulk asset issuance to multiple employees simultaneously
4. Automatically calculate and track due dates for asset returns
5. Generate professional Excel reports with embedded signature images
6. Preserve complete audit trail via non-destructive archiving (soft delete)
7. Provide real-time analytics dashboard with chart visualizations
8. Manage asset replacement requests from submission to resolution

---

## 7. System Architecture

### What is Architecture?
Architecture describes how different parts of the system are organized and how they talk to each other. Think of it like a restaurant: the customer (browser) orders food, the waiter (API) takes the order to the kitchen (backend), which fetches ingredients from the pantry (database) and returns the dish.

```
┌──────────────────────────────────────────────────────────────────┐
│                 BROWSER — What the user sees                     │
│                                                                  │
│  React Components render the UI                                  │
│  React Query manages what data to fetch and when                │
│  Axios sends HTTP requests with cookies automatically            │
└──────────────────────────────┬───────────────────────────────────┘
                               │ HTTP Request (with cookie)
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│              NODE.JS + EXPRESS SERVER (Port 5000)                │
│                                                                  │
│  1. cookie-parser reads the JWT cookie from every request        │
│  2. CORS middleware checks if the request origin is allowed      │
│  3. auth middleware verifies the JWT token is valid              │
│  4. Express router directs request to the right route handler    │
│  5. Route handler uses Mongoose to query or update MongoDB       │
│  6. Response sent back as JSON                                   │
│                                                                  │
│  Background: node-cron runs daily at 8 AM (checks overdue)      │
│  Reports: ExcelJS / PDFKit stream files to the browser           │
│  Signatures: fs.writeFileSync saves PNG to /public/signatures/   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ Mongoose queries
                               ↓
┌──────────────────────────────────────────────────────────────────┐
│                    MONGODB DATABASE                              │
│                                                                  │
│  Collections (like database tables):                             │
│  admins | employees | items | itemcategories                     │
│  issuerecords | replacementrequests                              │
└──────────────────────────────────────────────────────────────────┘
```

### How a Typical Request Works (Example: Admin views Issue Records)
```
Step 1: Admin opens "Issues" page in browser
Step 2: React Query calls useQuery('issues', fetchIssues)
Step 3: Axios sends: GET http://localhost:5000/api/issues
         — The HTTP cookie with JWT is automatically included
Step 4: Express receives the request
Step 5: cookie-parser extracts the JWT from the cookie
Step 6: auth middleware runs: jwt.verify(token, JWT_SECRET)
         — If valid: attaches admin info to req.admin, calls next()
         — If invalid: returns 401 Unauthorized immediately
Step 7: Route handler runs: IssueRecord.find({ archived: false })
         .populate('employee')         ← replaces employee ID with full employee data
         .populate({ path: 'item', populate: 'category' })  ← and item data too
Step 8: MongoDB returns matching documents
Step 9: Express sends JSON array to the browser
Step 10: React Query updates its cache
Step 11: React re-renders the table with the new data
```

---

## 8. Modules Description

### Module 1 — Authentication (Login System)
**Files:** `server/routes/auth.js`, `server/middleware/auth.js`, `client/src/pages/Login.jsx`

**How it works, step by step:**

When the admin types their email and password and clicks Login:
1. The frontend sends a POST request to `/api/auth/login` with `{ email, password }`
2. The backend finds the admin record with that email in MongoDB
3. `bcrypt.compare(password, admin.password_hash)` — this checks the entered password against the stored hash **without ever decrypting it**. BCrypt is one-way.
4. If they match, the server calls `jwt.sign({ id, name, email }, JWT_SECRET, { expiresIn: '1d' })` — this creates a digitally signed token that expires in 24 hours
5. The token is placed in an **HTTP-only cookie**: `res.cookie('token', token, { httpOnly: true })`
   - HTTP-only means JavaScript in the browser CANNOT read this cookie — protects against XSS attacks
   - The browser automatically sends this cookie with every future request
6. On logout: `res.clearCookie('token')` — removes the cookie from the browser

**What is Middleware? (auth.js)**

Middleware is a function that runs BETWEEN receiving a request and sending a response. Think of it as a security guard at a door. Every request must pass through the guard before reaching the actual data.

The `auth.js` middleware:
```javascript
const authMiddleware = (req, res, next) => {
    const token = req.cookies.token;           // Read the cookie
    if (!token) return res.status(401)...      // No cookie? Reject.
    const decoded = jwt.verify(token, secret); // Verify it's authentic
    req.admin = decoded;                        // Attach admin info to request
    next();                                     // Allow request to continue
};
```
Every route file starts with `router.use(authMiddleware)` — this protects ALL routes in that file automatically.

---

### Module 2 — Employee Management
**Files:** `server/routes/employees.js`, `server/models/Employee.js`, `client/src/pages/Employees.jsx`

The Employee model defines what fields every employee record must have:
- `emp_code`: unique employee identifier (e.g., EMP001). `unique: true` at DB level means MongoDB will reject any attempt to save a duplicate code.
- `name`, `department`, `designation`: basic info
- `status`: `active` or `inactive`

The routes file handles:
- `GET /api/employees` → returns all employees from MongoDB
- `POST /api/employees` → validates and saves a new employee

On the frontend, `Employees.jsx` uses `useQuery('employees', getEmployees)` from React Query. When a new employee is added via the form, `useMutation` calls the POST endpoint, and on success `queryClient.invalidateQueries('employees')` tells React Query to re-fetch and update the table automatically.

---

### Module 3 — Item & Category Management
**Files:** `server/routes/items.js`, `server/models/Item.js`, `server/models/ItemCategory.js`, `client/src/pages/Items.jsx`

Items belong to Categories. This is a one-to-many relationship:
- One Category (e.g., "Safety Gear") can have many Items (e.g., "Helmet", "Gloves", "Boots")
- In MongoDB, Item documents store the Category's `_id` as a reference field

The Item model has two scheduling fields:
- `frequency_days: Number` — if set, the due date = issue_date + frequency_days
- `fixed_date: Date` — if set, the due date = this specific date regardless of when issued

At issuance time, this logic calculates `next_due_date`:
```javascript
const next_due_date = item.fixed_date
    ? new Date(item.fixed_date)
    : dayjs(issuedDateObj).add(item.frequency_days, 'day').toDate();
```

---

### Module 4 — Issue Management (The Core)
**Files:** `server/routes/issues.js`, `server/models/IssueRecord.js`, `client/src/pages/Issues.jsx`

This is the heart of the application. The issues route file handles 5 endpoints:

**GET `/api/issues`** — Fetch records with filters
```javascript
query.archived = archived === 'true' ? true : { $ne: true };
// $ne: true means "not equal to true" — so only non-archived by default
if (status === 'overdue')      query.next_due_date = { $lt: today };
if (status === 'due_soon')     query.next_due_date = { $gte: today, $lte: nextWeek };
if (status === 'pending_ack')  query.acknowledged = { $ne: true };
if (status === 'acknowledged') query.acknowledged = true;
```
After filtering, `.populate('employee')` replaces the stored employee ObjectId with the full employee document. Same for `.populate({ path: 'item', populate: { path: 'category' } })` which also populates the item's category.

**GET `/api/issues/due`** — Due Tracking page
Runs 3 database queries in parallel using `Promise.all()` (faster than running them one by one):
- Overdue: `next_due_date < today`
- Due this week: `today <= next_due_date <= nextWeek`
- Upcoming: `nextWeek < next_due_date <= nextMonth`

**POST `/api/issues`** — Bulk Issue
Accepts either `employee_id` (single) or `employee_ids` (array) and an `items` array:
```javascript
for (const empId of targetEmployeeIds) {
    for (const targetItem of targetItems) {
        // Check for existing active record (duplicate prevention)
        const activeIssue = await IssueRecord.findOne({
            employee: empId, item: itId,
            next_due_date: { $gte: today }
        });
        if (activeIssue && !req.body.override) continue; // skip silently in bulk

        // Calculate due date from item config
        const next_due_date = item.fixed_date
            ? new Date(item.fixed_date)
            : dayjs(issuedDateObj).add(item.frequency_days, 'day').toDate();

        const record = new IssueRecord({ employee: empId, item: itId, ... });
        await record.save();
    }
}
```

**PUT `/api/issues/acknowledge/employee/:employeeId`** — Bulk Signature (all pending for employee)
**PUT `/api/issues/acknowledge/:id`** — Single record acknowledgement
(Detailed in Section 11 — Code Workflow)

**PUT `/api/issues/archive-reset`** — Archive (Soft Delete)
Supports three scopes:
- `scope: 'all'` → archives every non-archived record
- `scope: 'employee'` → archives all records for one specific employee
- `scope: 'selected'` → archives only the provided `issue_ids` array
```javascript
await IssueRecord.updateMany(filter, {
    $set: { archived: true, archived_at: new Date(),
            archived_by: req.admin.id, archive_reason: 'Reset for new issuance' }
});
```

---

### Module 5 — Dashboard & Analytics
**Files:** `server/routes/dashboard.js`, `client/src/pages/Dashboard.jsx`

**GET `/api/dashboard/stats`**
Runs 5 database count queries simultaneously using `Promise.all()`:
```javascript
const [totalEmployees, itemsIssuedThisMonth, pendingReplacements,
       itemsDueNext7Days, overdueItems] = await Promise.all([
    Employee.countDocuments({ status: 'active' }),
    IssueRecord.countDocuments({ issued_date: { $gte: startOfMonth, $lte: endOfMonth } }),
    ReplacementRequest.countDocuments({ status: 'pending' }),
    IssueRecord.countDocuments({ next_due_date: { $gte: today, $lte: nextWeek } }),
    IssueRecord.countDocuments({ next_due_date: { $lt: today } })
]);
```

**GET `/api/dashboard/chart-data`**
Fetches issue records from the past 6 months. Groups them by month name, counts how many were issued each month, and returns an array that Recharts uses to draw the bar chart.

---

### Module 6 — Reporting (Excel + PDF)
**Files:** `server/routes/reports.js`, `client/src/pages/Reports.jsx`

The report endpoint receives `?format=xlsx` or `?format=pdf`. Optional filters: `startDate`, `endDate`, `department`.

For **Excel**: ExcelJS builds the workbook entirely in memory, then streams it directly to the HTTP response. The browser receives it as a file download. No temporary file is saved on disk.

For **PDF**: PDFKit pipes a stream directly to `res`. The PDF is generated on-the-fly and downloaded simultaneously.

---

### Module 7 — Automated Overdue Check (Background Job)
**File:** `server/jobs/cron.js`

```javascript
cron.schedule('0 8 * * *', async () => {
    // 0 8 * * * means: minute=0, hour=8, every day, every month, every weekday
    const today = dayjs().startOf('day').toDate();
    const overdueIssues = await IssueRecord.find({
        next_due_date: { $lt: today }
    }).populate('employee item');
    console.log(`Found ${overdueIssues.length} overdue items`);
});
```
This runs automatically every morning when the server is running. No admin action required.

---

## 9. Database Design

### What is a Database Collection?
In MongoDB, data is stored in **Collections** (similar to tables in Excel or SQL). Each row is called a **Document** and is stored in JSON format. There are no rigid column definitions — each document can have its own fields. However, we enforce structure using **Mongoose Schemas**.

### Why MongoDB Instead of SQL?
- Our data is JSON from frontend to backend to database — everything stays consistent
- MongoDB handles nested objects naturally (e.g., embedding signature paths inside issue records)
- Flexible schema lets us add new fields (like `archived`, `fixed_date`) without complex database migrations

### Relationships Between Collections
```
ItemCategory (1) ────── has many ──────> Item (many)
     "Safety Gear"                    "Helmet", "Gloves"

Item          (many) <──── referenced in ──── IssueRecord
Employee      (many) <──── referenced in ──── IssueRecord
Admin         (1)    <──── issued_by     ──── IssueRecord
Admin         (1)    <──── archived_by   ──── IssueRecord

Employee (many) <──── referenced in ──── ReplacementRequest
Item     (many) <──── referenced in ──── ReplacementRequest
Admin    (1)    <──── resolved_by   ──── ReplacementRequest
```

### Collection: admins
```json
{
  "_id": "ObjectId (auto-generated)",
  "name": "Admin",
  "email": "admin@provexa.com",
  "password_hash": "$2b$10$xyz...",
  "created_at": "2025-05-01T00:00:00.000Z"
}
```

### Collection: employees
```json
{
  "_id": "ObjectId",
  "emp_code": "EMP001",
  "name": "Ravi Kumar",
  "department": "Security",
  "designation": "Guard",
  "status": "active",
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

### Collection: itemcategories
```json
{ "_id": "ObjectId", "name": "Safety Gear" }
```

### Collection: items
```json
{
  "_id": "ObjectId",
  "name": "Safety Helmet",
  "category": "ObjectId → references itemcategories._id",
  "frequency_days": 365,
  "fixed_date": null,
  "description": "ISI certified hard hat"
}
```

### Collection: issuerecords (THE CORE TABLE)
```json
{
  "_id": "ObjectId",
  "employee": "ObjectId → employees._id",
  "employee_name": "Ravi Kumar",
  "item": "ObjectId → items._id",
  "item_name": "Safety Helmet",
  "issued_date": "2025-01-01T00:00:00.000Z",
  "next_due_date": "2026-01-01T00:00:00.000Z",
  "quantity": 1,
  "issued_by": "ObjectId → admins._id",
  "issue_status": "Acknowledged",
  "signature_path": "/public/signatures/sig_emp_1714567890_empid.png",
  "acknowledged": true,
  "acknowledgement_time": "2025-01-02T10:30:00.000Z",
  "notes": "Annual issue",
  "archived": false,
  "archived_at": null,
  "archived_by": null,
  "archive_reason": null,
  "created_at": "2025-01-01T00:00:00.000Z"
}
```

> Why are `employee_name` and `item_name` stored directly even though we have references?
> This is called **denormalization**. It allows MongoDB Compass to show readable names instead of cryptic ObjectIds. It also speeds up report generation slightly since we don't need to populate for display purposes.

### Collection: replacementrequests
```json
{
  "_id": "ObjectId",
  "employee": "ObjectId → employees._id",
  "employee_name": "Ravi Kumar",
  "item": "ObjectId → items._id",
  "item_name": "Safety Helmet",
  "reason": "Helmet cracked during site incident",
  "status": "approved",
  "requested_date": "2025-04-15T00:00:00.000Z",
  "resolved_date": "2025-04-16T00:00:00.000Z",
  "resolved_by": "ObjectId → admins._id",
  "notes": "New helmet issued from store on 16-Apr"
}
```

---

## 10. API Documentation

> **Base URL:** `http://localhost:5000`
> **Authentication:** Uses HTTP-only cookie set on login. No manual token needed — the browser sends it automatically with every request.
> **Important:** All endpoints except `/api/auth/login` require the admin to be logged in.

---

### 🔐 Authentication Routes — `/api/auth`

#### POST `/api/auth/login` — Login
```
What it does: Verifies email + password, creates JWT, sets it in an HTTP-only cookie.

Request Body (JSON):
{
  "email": "admin@provexa.com",
  "password": "admin123"
}

Success Response (200):
{
  "message": "Logged in successfully",
  "user": { "id": "...", "name": "Admin", "email": "admin@provexa.com" }
}

Error (401): { "message": "Invalid credentials" }
Error (500): { "message": "Server error" }
```

#### POST `/api/auth/logout` — Logout
```
What it does: Clears the JWT cookie from the browser.
Response: { "message": "Logged out successfully" }
```

#### GET `/api/auth/me` — Check Login Status
```
What it does: Returns the current logged-in admin's info from the cookie.
Response: { "user": { "id": "...", "name": "Admin", "email": "..." } }
```

---

### 👷 Employee Routes — `/api/employees`

#### GET `/api/employees`
```
What it does: Returns all employees from the database.
Response (200): Array of employee objects
[
  { "id":"...", "emp_code":"EMP001", "name":"Ravi Kumar",
    "department":"Security", "designation":"Guard", "status":"active" }
]
```

#### POST `/api/employees`
```
What it does: Creates a new employee. emp_code must be unique.
Request Body: { "emp_code":"EMP010", "name":"Anitha Raj", "department":"HR", "designation":"Executive" }
Response (201): The created employee object
Error (400): { "message": "Employee code already exists" }
```

---

### 📦 Item & Category Routes — `/api/items`, `/api/categories`

#### GET `/api/categories`
```
Response: [{ "id":"...", "name":"Safety Gear" }, { "id":"...", "name":"Uniforms" }]
```

#### POST `/api/categories`
```
Request: { "name": "PPE Kits" }
Response (201): Created category object
```

#### GET `/api/items`
```
Response: Items with category fully populated
[{
  "id":"...", "name":"Safety Helmet",
  "category": { "id":"...", "name":"Safety Gear" },
  "frequency_days": 365,
  "fixed_date": null
}]
```

#### POST `/api/items`
```
Frequency Mode:  { "name":"Work Shirt", "category":"category_id", "frequency_days":180 }
Fixed Date Mode: { "name":"Annual Jacket", "category":"category_id", "fixed_date":"2025-12-31" }
Response (201): Created item object
```

---

### 📋 Issue Routes — `/api/issues`

#### GET `/api/issues` — Get Issue Records
```
Query Parameters (all optional):
  ?archived=true          → show archived records (Issue History)
  ?archived=false         → show active records (default)
  ?status=overdue         → only records where next_due_date < today
  ?status=due_soon        → due within the next 7 days
  ?status=pending_ack     → not yet acknowledged
  ?status=acknowledged    → already acknowledged
  ?employee_id=...        → filter by specific employee
  ?item_id=...            → filter by specific item

Response: Array of issue records with employee and item details fully populated
```

#### GET `/api/issues/due` — Due Tracking Data
```
What it does: Returns three categories of due records simultaneously.
Response:
{
  "overdue": [...],        // next_due_date < today
  "dueThisWeek": [...],   // due in next 0-7 days
  "upcoming": [...]        // due in 8-30 days
}
```

#### POST `/api/issues` — Bulk Issue Assets
```
What it does: Creates multiple IssueRecord documents in one call.
Can target one employee (employee_id) or many (employee_ids array).
Can issue one or many items (items array).

Request Body:
{
  "employee_ids": ["empId1", "empId2"],
  "items": [
    { "item_id": "itemId1", "quantity": 1 },
    { "item_id": "itemId2", "quantity": 2 }
  ],
  "issued_date": "2025-05-01",
  "notes": "Annual safety gear distribution",
  "override": false
}

What happens internally:
- Loops through every employee × every item combination
- Checks if active record already exists (skip if override=false)
- Calculates next_due_date from item config
- Saves IssueRecord with issue_status: "Pending Acknowledgement"

Response (201): { "count": 4, "records": [...] }
Error (400): { "message": "No employees selected" }
```

#### PUT `/api/issues/acknowledge/employee/:employeeId` — Bulk Acknowledge (All Pending)
```
What it does: Signs ALL pending items for one employee with a single signature.

Request Body: { "signature": "data:image/png;base64,iVBORw0KGgo..." }

What happens internally:
1. Find all IssueRecords where employee = employeeId AND issue_status = "Pending Acknowledgement"
2. Strip the Base64 header: signature.replace(/^data:image\/\w+;base64,/, "")
3. Convert to binary: Buffer.from(base64Data, 'base64')
4. Save to disk: fs.writeFileSync(path.join(dir, filename), buffer)
   → File saved as: /public/signatures/sig_emp_{timestamp}_{employeeId}.png
5. Update ALL pending records:
   IssueRecord.updateMany(
     { employee: employeeId, issue_status: "Pending Acknowledgement" },
     { $set: { issue_status:"Acknowledged", acknowledged:true,
               signature_path:"/public/signatures/...", acknowledgement_time:now } }
   )

Response (200): { "message": "Successfully acknowledged 3 items.", "count": 3 }
Error (400): { "message": "Signature is required" }
Error (404): { "message": "No pending issues found for this employee" }
```

#### PUT `/api/issues/acknowledge/:id` — Single Record Acknowledge
```
What it does: Acknowledges one specific IssueRecord by its ID.
Same signature save + update logic, but only updates that one record.
Response (200): { "message": "Successfully acknowledged receipt.", "issue": {...} }
```

#### PUT `/api/issues/archive-reset` — Archive Issues (Soft Delete)
```
What it does: Moves active issue records to archive WITHOUT deleting them.
Supports three modes:

Mode 1 - Archive everything:
{ "scope": "all" }

Mode 2 - Archive one employee's records:
{ "scope": "employee", "employee_id": "empId1" }

Mode 3 - Archive specific records:
{ "scope": "selected", "issue_ids": ["id1", "id2", "id3"] }

What happens:
IssueRecord.updateMany(filter, {
  $set: {
    archived: true,
    archived_at: <current datetime>,
    archived_by: <admin who clicked it>,
    archive_reason: "Reset for new issuance"
  }
})

Response (200): { "message": "42 issue record(s) archived successfully.", "count": 42 }
```

---

### 🔄 Replacement Routes — `/api/replacements`

#### GET `/api/replacements`
```
Response: All replacement requests with employee and item details
[{
  "id":"...", "employee_name":"Ravi Kumar", "item_name":"Safety Helmet",
  "reason":"Cracked", "status":"pending", "requested_date":"..."
}]
```

#### POST `/api/replacements`
```
Request: { "employee_id":"...", "item_id":"...", "reason":"Helmet cracked in incident" }
Response (201): Created replacement request
```

#### PATCH `/api/replacements/:id`
```
What it does: Admin approves or rejects a request.
Request: { "status": "approved", "notes": "New helmet issued from Store Room B" }
Response (200): Updated replacement request with resolved_date and resolved_by saved
```

---

### 📈 Dashboard Routes — `/api/dashboard`

#### GET `/api/dashboard/stats`
```
Response:
{
  "totalEmployees": 45,
  "itemsIssuedThisMonth": 32,
  "pendingReplacements": 3,
  "itemsDueNext7Days": 8,
  "overdueItems": 5
}
```

#### GET `/api/dashboard/chart-data`
```
Response: Array of 6 months with issue counts for Recharts bar chart
[
  { "name": "Dec 2024", "issues": 12 },
  { "name": "Jan 2025", "issues": 28 },
  { "name": "Feb 2025", "issues": 8 },
  ...
]
```

---

### 📊 Report Routes — `/api/reports`

#### GET `/api/reports/issues?format=xlsx`
```
Query Parameters:
  format=xlsx   → Download Excel file with embedded signatures
  format=pdf    → Download PDF report

Optional Filters:
  ?startDate=2025-01-01
  ?endDate=2025-12-31
  ?department=Security

Excel Response Headers:
  Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
  Content-Disposition: attachment; filename="issue_records.xlsx"
  → Browser automatically downloads the file

PDF Response Headers:
  Content-Type: application/pdf
  Content-Disposition: attachment; filename="issue_records.pdf"
```

---

## 11. Code Workflow Explanation

### How the Entire System Starts (server/index.js)
```javascript
// 1. Load .env file into process.env
dotenv.config();

// 2. Apply global Mongoose plugin BEFORE importing models
// This transforms _id → id and removes __v from all JSON responses
mongoose.plugin(schema => {
    schema.set('toJSON', {
        transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
    });
});

// 3. Import all route files
const authRoutes = require('./routes/auth');
const issueRoutes = require('./routes/issues');
// ... etc

// 4. Import cron job (auto-starts the scheduler)
require('./jobs/cron');

// 5. Set up Express app
const app = express();
app.use(express.json({ limit: '10mb' }));  // Parse JSON bodies (10MB for signature data)
app.use(cookieParser());                   // Parse cookies
app.use('/public', express.static(...));   // Serve signature images publicly

// 6. Configure CORS (which origins can call the API)
app.options(/(.*)/,  cors(corsOptions));   // Handle preflight
app.use(cors(corsOptions));

// 7. Connect to MongoDB
mongoose.connect(process.env.DATABASE_URL);

// 8. Register all routes
app.use('/api/auth', authRoutes);
app.use('/api/issues', issueRoutes);

// 9. Start listening
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

---

### How Digital Signature Capture Works (Complete Flow)

This is the most unique and technically interesting feature. Here is exactly what happens from the moment an employee touches the screen to when the signature appears in an Excel file:

**Step 1 — The Canvas (Frontend: EmployeeSignatureModal.jsx)**
```javascript
// react-signature-canvas renders an HTML5 Canvas element
<SignatureCanvas
  ref={signatureCanvasRef}
  penColor="black"
  canvasProps={{ className: "signature-canvas" }}
/>
```
The HTML5 Canvas is like a drawing board on the screen. The `react-signature-canvas` library listens to mouse/touch events and draws smooth curves as the user moves their finger or mouse.

**Step 2 — Export to Base64 (Frontend)**
```javascript
// When admin clicks "Submit Signature":
const base64String = signatureCanvasRef.current.toDataURL('image/png');
// Result looks like: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA..."
// This is the ENTIRE image encoded as text characters
```
`toDataURL('image/png')` converts everything drawn on the canvas into a PNG image, then encodes that image as a Base64 text string. Base64 is a way to represent binary data (like image bytes) using only text characters so it can be safely sent in JSON.

**Step 3 — Send to Backend (Frontend: Axios)**
```javascript
await axios.put(`/api/issues/acknowledge/employee/${employeeId}`, {
    signature: base64String
});
```

**Step 4 — Strip the Header (Backend: routes/issues.js)**
```javascript
// The Base64 string starts with: "data:image/png;base64,"
// We only need the actual data part after the comma
const base64Data = signature.replace(/^data:image\/\w+;base64,/, "");
// Now base64Data = "iVBORw0KGgoAAAANSUhEUgAAA..."
```

**Step 5 — Convert Base64 to Binary Buffer (Backend)**
```javascript
const buffer = Buffer.from(base64Data, 'base64');
// Buffer is Node.js's way of handling raw binary data (bytes)
// This buffer contains the actual PNG image bytes
```

**Step 6 — Write to Disk as PNG File (Backend)**
```javascript
const filename = `sig_emp_${Date.now()}_${employeeId}.png`;
// Date.now() gives milliseconds since 1970 — guarantees unique filename

const dir = path.join(__dirname, '..', 'public', 'signatures');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const filepath = path.join(dir, filename);
fs.writeFileSync(filepath, buffer);
// The PNG file now exists on the server's hard drive
```

**Step 7 — Save Path and Update Database (Backend)**
```javascript
const signature_path = `/public/signatures/${filename}`;

await IssueRecord.updateMany(
    { employee: employeeId, issue_status: 'Pending Acknowledgement' },
    { $set: {
        issue_status: 'Acknowledged',
        acknowledged: true,
        signature_path: signature_path,    // e.g. "/public/signatures/sig_emp_1714567890_abc.png"
        acknowledgement_time: new Date()
    }}
);
```

**Step 8 — Serve the Image (server/index.js)**
```javascript
app.use('/public', express.static(path.join(__dirname, 'public')));
// This line makes any file in /public/ accessible via HTTP
// So http://localhost:5000/public/signatures/sig_emp_*.png will return the image
```

**Step 9 — Embed in Excel Report (routes/reports.js)**
```javascript
// When generating the Excel report:
if (issue.signature_path) {
    const sigFilePath = path.join(__dirname, '..', issue.signature_path.replace(/^\//, ''));

    if (fs.existsSync(sigFilePath)) {
        const imageId = workbook.addImage({
            filename: sigFilePath,
            extension: 'png',
        });
        worksheet.addImage(imageId, {
            tl: { col: 13, row: rowIndex - 1 },   // top-left corner: column 14, this row
            ext: { width: 320, height: 110 },       // pixel dimensions (320×110px)
            editAs: 'oneCell',
        });
    }
    row.height = 130;  // Make row tall enough to display the image
}
```
The signature image is physically embedded inside the `.xlsx` file — it is not a link. When you open the Excel file, the signature is visible even without internet connection.

---

### How Archive (Soft Delete) Works

**What is Soft Delete?**
In a normal delete, data is permanently removed from the database. In a soft delete, the record stays in the database but gets a flag (`archived: true`) that hides it from normal views. This is like moving a file to the Recycle Bin instead of permanently deleting it.

**Why use soft delete here?**
- HR auditors need access to old distribution records
- Legal requirements may mandate keeping asset records for years
- Admins need a clean view for the current cycle without old records cluttering it

**How it works:**
```javascript
// Before archive: IssueRecord in DB
{ archived: false, issue_status: "Acknowledged", employee: "Ravi", item: "Helmet" }

// After clicking "Reset Current Issues":
PUT /api/issues/archive-reset  { scope: "all" }

// Backend runs:
IssueRecord.updateMany(
    { archived: { $ne: true } },           // only non-archived records
    { $set: {
        archived: true,                    // hidden from active views
        archived_at: new Date(),           // when it was archived
        archived_by: req.admin.id,         // who archived it
        archive_reason: "Reset for new issuance"
    }}
)

// Active issues page queries: { archived: false } → shows 0 results now
// Issue History page queries: { archived: true }  → shows all old records
```

---

## 12. Tools and Technologies Explanation

### What is React and Why Use It?
React is a JavaScript library developed by Facebook for building user interfaces. Traditional websites reload the entire page every time something changes. React uses a **Virtual DOM** — it keeps a copy of the page in memory, compares what changed, and only updates those specific parts. This makes the UI feel instant.

In PROVEXA, the entire application is a **Single Page Application (SPA)** — there is only one HTML file (`index.html`). React dynamically updates the content without ever loading a new page.

### What is Vite and Why Not webpack?
Vite is the build tool that takes our React code and prepares it for the browser. During development, Vite uses the browser's native ES Module support — it serves files directly without bundling. This means the dev server starts in under 1 second. Older tools like Create React App use webpack which can take 30-60 seconds to start.

When you run `npm run build`, Vite uses **Rollup** to bundle everything into optimized static files (HTML, CSS, JS) that any web server can serve.

### What is Tailwind CSS?
Tailwind is a "utility-first" CSS framework. Instead of writing CSS in a separate file like this:
```css
.button { background-color: blue; color: white; padding: 8px 16px; border-radius: 4px; }
```
You write the styles directly in the JSX using class names:
```jsx
<button className="bg-blue-600 text-white px-4 py-2 rounded">Click</button>
```
Tailwind provides hundreds of tiny, single-purpose classes. The `tailwind.config.js` file lets us define custom colors, fonts, and breakpoints. `postcss.config.js` is required because Tailwind uses PostCSS to process and generate the final CSS at build time.

### What is React Query (TanStack Query)?
Without React Query, fetching data requires a lot of manual code:
```javascript
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

useEffect(() => {
    setLoading(true);
    fetch('/api/employees').then(r => r.json()).then(d => { setData(d); setLoading(false); });
}, []);
```
React Query replaces ALL of this with one line:
```javascript
const { data, isLoading, error } = useQuery('employees', () => axios.get('/api/employees'));
```
Additionally, React Query **caches** the response. If you navigate away and come back, the cached data shows instantly while it re-fetches in the background. When you add/edit data using `useMutation`, calling `queryClient.invalidateQueries('employees')` automatically triggers a re-fetch and UI update.

### What is Axios?
Axios is an HTTP client that sends requests from the browser to the backend. In `client/src/lib/api.js`, we create a configured Axios instance:
```javascript
const api = axios.create({
    baseURL: 'http://localhost:5000',
    withCredentials: true   // ← This is CRITICAL: sends the HTTP-only cookie with every request
});
```
`withCredentials: true` ensures the JWT cookie (set by the server on login) is automatically included in every API call. Without this, the cookie would not be sent and every request would return 401 Unauthorized.

### What is Express and How Does Routing Work?
Express is a minimal web framework for Node.js. It receives HTTP requests and routes them to the appropriate handler function.

In `server/index.js`:
```javascript
app.use('/api/auth', authRoutes);     // Any request to /api/auth/* goes to routes/auth.js
app.use('/api/issues', issueRoutes);  // Any request to /api/issues/* goes to routes/issues.js
```

Inside `routes/issues.js`:
```javascript
const router = express.Router();
router.get('/', handler);                            // GET /api/issues/
router.post('/', handler);                           // POST /api/issues/
router.put('/acknowledge/employee/:employeeId', h);  // PUT /api/issues/acknowledge/employee/abc123
router.put('/archive-reset', handler);               // PUT /api/issues/archive-reset
```

The `:employeeId` part is a **URL parameter** — it captures whatever is in that position. `req.params.employeeId` gives us the value.

### What is Mongoose and How Does It Help?
MongoDB itself has no schema — you can store any shape of data. Mongoose adds a schema layer:
```javascript
const issueRecordSchema = new mongoose.Schema({
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    acknowledged: { type: Boolean, default: false },
    issue_status: { type: String, enum: ['Pending Acknowledgement', 'Acknowledged'] }
});
```
- `required: true` → MongoDB will reject documents missing this field
- `enum` → only allows those specific string values
- `default` → automatically sets the value if not provided
- `ref: 'Employee'` → enables `.populate('employee')` to replace the ObjectId with the full Employee document

### What is JWT and How Does It Work?
A JWT (JSON Web Token) is a self-contained token that proves identity. It has three parts separated by dots:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    ← Header (algorithm info)
eyJpZCI6IjY2NGFiYzEyMyIsIm5hbWUiOiJBZG1pbiJ9.    ← Payload (data: id, name)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c    ← Signature (tamper-proof hash)
```
The server signs the token with `JWT_SECRET`. If anyone modifies the payload, the signature becomes invalid. `jwt.verify()` checks this automatically.

### What is bcryptjs?
BCrypt is a password hashing function designed to be slow (computationally expensive). This is intentional — it makes brute-force attacks impractical.

```javascript
// When admin is created:
const hash = await bcrypt.hash('admin123', 10);  // 10 = work factor (rounds)
// Stored in DB: "$2b$10$XDXMSBfwz0BIZ4ZEEJkVge..."

// When admin logs in:
const isMatch = await bcrypt.compare('admin123', storedHash);
// Returns true if they match — original password is NEVER recovered
```

### What is node-cron?
node-cron uses cron syntax to schedule tasks. The format is: `minute hour day month weekday`
```
0 8 * * *
│ │ │ │ └── Any weekday (Mon-Sun)
│ │ │ └──── Any month
│ │ └────── Any day of month
│ └──────── Hour 8 (8 AM)
└────────── Minute 0 (at the start of the hour)
```
So `0 8 * * *` = "Run at 8:00 AM every day".

### What is ExcelJS and Why Not Just CSV?
CSV is a plain text format — it cannot contain formatting or images. ExcelJS creates real `.xlsx` files with:
- Styled cells (background colors, bold text, borders)
- Column widths and row heights
- Frozen rows (first row stays visible when scrolling)
- **Embedded images** — PNG files are converted to Base64 and embedded inside the Excel binary format

This is why ExcelJS was chosen over simpler alternatives like the `xlsx` npm package — only ExcelJS supports proper image embedding.

---

## 13. Setup and Execution Guide

### Starting the Full Application (Development Mode)

You need **two terminal windows** open at the same time:

**Terminal Window 1 — Backend:**
```bash
cd e:\PROVEXA\server
npm install              # Install all backend packages (only needed first time)
npm run seed             # Creates admin account and sample data in MongoDB
npm run dev              # Starts server with nodemon (auto-restart on changes)
```
You should see:
```
Connected to MongoDB
Server running on port 5000
[Cron Job] Scheduler started
```

**Terminal Window 2 — Frontend:**
```bash
cd e:\PROVEXA\client
npm install              # Install all frontend packages (only needed first time)
npm run dev              # Starts Vite development server
```
You should see:
```
VITE v5.4.x ready
➜ Local:   http://localhost:5173/
```

Now open **http://localhost:5173** in your browser.

### Environment Variables Reference
| Variable | Purpose | Example |
|----------|---------|---------|
| `PORT` | Which port the backend listens on | `5000` |
| `DATABASE_URL` | MongoDB connection string | `mongodb://localhost:27017/ProvexaDB` |
| `JWT_SECRET` | Secret key to sign JWT tokens — keep this private! | `any_random_long_string` |

### Available npm Commands

**Backend (`server/` folder):**
| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start with nodemon (restarts server on file save) |
| `npm start` | Start without nodemon (for production) |
| `npm run seed` | **WARNING: Clears database** and creates admin@provexa.com |

**Frontend (`client/` folder):**
| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start Vite dev server with hot reload |
| `npm run build` | Build optimized production files into `/dist` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Check code for errors using ESLint |

---

## 14. GitHub Usage Section

### What is Git and GitHub?
- **Git** is a version control tool installed on your computer. It tracks changes to files.
- **GitHub** is a website that hosts your Git repository online so others (or you from another computer) can access it.
- Think of Git like a save-game system — every `commit` is a save point you can go back to.

### Complete Commands to Push to GitHub (Run These Manually)

Open a terminal in the PROVEXA folder:

```bash
# Navigate to project root
cd e:\PROVEXA

# Step 1: Initialize a git repository (only needed if not already done)
git init

# Step 2: Stage ALL files for commit (the dot means "everything")
git add .

# Step 3: Create a commit (snapshot) with a message describing what you did
git commit -m "Initial commit: Complete Provexa System"

# Step 4: Connect to your GitHub repository
git remote add origin https://github.com/Keerthana2225/PROVEXA.git

# Step 5: Rename the default branch to "main"
git branch -M main

# Step 6: Push your code to GitHub (-u sets upstream so future "git push" works without arguments)
git push -u origin main
```

### After the Initial Push — Daily Commands

Every time you make changes and want to save them to GitHub:
```bash
# Check which files changed
git status

# Stage all changes
git add .

# Commit with a descriptive message
git commit -m "feat: add department filter to reports"

# Push to GitHub
git push
```

### Pulling Changes from GitHub
If you work on another computer or someone else made changes:
```bash
git pull origin main
```

### Working with Branches (Feature Development)
```bash
# Create a new branch for a feature
git checkout -b feature/email-notifications

# Work on your code... then commit
git add .
git commit -m "feat: add email notification for overdue items"

# Push the branch to GitHub
git push -u origin feature/email-notifications

# When feature is done, switch back to main
git checkout main

# Merge your feature into main
git merge feature/email-notifications

# Push the merged main to GitHub
git push

# Clean up: delete the feature branch
git branch -d feature/email-notifications
```

### Undoing Mistakes
```bash
# Undo changes to a file before staging
git checkout -- server/routes/issues.js

# Unstage a file (you ran git add but want to undo)
git reset HEAD server/routes/issues.js

# Undo the last commit but keep the changes
git reset --soft HEAD~1

# See last 10 commits
git log --oneline -10
```

### .gitignore — What is NOT Pushed to GitHub
The `.gitignore` files already in the project tell Git to ignore:
- `node_modules/` → Contains thousands of downloaded packages. They are reinstalled with `npm install`
- `.env` → Contains secret keys. **NEVER commit this.** Use `.env.example` as a template instead
- `dist/` → Built files. Regenerated with `npm run build`

### Good Commit Message Format
```bash
feat: add feature      # New functionality
fix: resolve bug       # Bug fix
docs: update readme    # Documentation change
style: fix alignment   # UI/CSS change
refactor: clean code   # Code restructuring without changing behavior
chore: update deps     # Dependency updates
```

---

## 15. Conclusion

PROVEXA is a production-ready, full-stack enterprise system that demonstrates real engineering solutions to real business problems.

### What This Project Demonstrates

**Backend Engineering:**
- REST API design with proper HTTP methods (GET, POST, PUT, PATCH)
- JWT + HTTP-only cookie authentication (more secure than localStorage)
- Mongoose schema design with relationships across 6 collections
- Soft delete pattern (archived flag) for non-destructive data management
- Bulk database operations with `updateMany` for performance
- Parallel database queries with `Promise.all()` for speed
- Binary file operations: converting Base64 → Buffer → PNG file
- Scheduled background jobs with cron syntax
- Dynamic file generation: ExcelJS with embedded images, PDFKit streaming

**Frontend Engineering:**
- React SPA with component-based architecture
- Server state management with React Query (caching, mutations, invalidation)
- HTTP-only cookie authentication with `withCredentials: true`
- Digital signature capture using HTML5 Canvas API
- Tailwind CSS utility-first responsive design
- React Router v6 for client-side navigation with protected routes
- Recharts integration for dashboard analytics

**Database Engineering:**
- MongoDB document design with references (ObjectId)
- Query filtering with MongoDB operators: `$lt`, `$gt`, `$gte`, `$lte`, `$ne`, `$in`
- Population (joining) across multiple collections
- Denormalization for performance (storing `employee_name` in `IssueRecord`)
- Index utilization through Mongoose schema constraints

### Problems Solved
| Problem | Solution |
|---------|---------|
| Paper registers get lost | Digital records in MongoDB — permanent and searchable |
| No proof of handover | Digital signature captured as PNG + timestamp |
| Manual overdue tracking | Automated daily cron job at 8 AM |
| Slow manual reports | Excel/PDF generated in seconds via API |
| Data deleted after distribution cycle | Archive (soft delete) — data preserved forever |
| Security of login tokens | HTTP-only cookie — inaccessible to JavaScript/XSS |

### Future Enhancements
- Email/SMS notifications for overdue items
- Employee self-service portal (employees log in to view their own records)
- Barcode/QR code scanning for asset identification
- AWS S3 integration for signature image storage in cloud deployments
- Multi-tenant support for multiple organizations
- Mobile app version with React Native

---

<div align="center">
  <p>Built with dedication by <strong>Keerthana</strong></p>
  <p>Full Stack Developer | MERN Stack | Enterprise Systems</p>
  <a href="https://github.com/Keerthana2225">GitHub: Keerthana2225</a>
</div>
