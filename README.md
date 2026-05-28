# PROVEXA
### Enterprise Asset Management & OCR Handover Verification System

---

## 1. Project Description

**PROVEXA** is a modern, enterprise-scale Asset Management and Handover Verification System. It is engineered specifically for manufacturing plants, assembly facilities, and logistics hubs to automate, track, and secure the distribution and lifecycle of employee gear. The system manages uniforms, safety equipment (PPE), linen, and operator welfare benefits under a single unified dashboard.

Unlike standard inventory tracking software, PROVEXA introduces a **zero-trust handover protocol** at the physical point of issue. It integrates **Computer Vision (OpenCV)** and **Deep Learning Optical Character Recognition (EasyOCR + PyTorch)** to scan physical employee badge IDs, combined with **HTML5 canvas digital signatures**. This eliminates verbal handovers, paper register logs, and asset shrinkage. 

Every asset issue is screened by an automated **Quota & Eligibility Engine** that applies corporate rules based on employee attributes (tenure, gender, department, designation, and union membership) in real time to prevent duplicate issues, track exchanges, and automate payroll deductions.

---

## 2. Executive Summary

In high-workforce industrial sectors, managing physical assets represents a massive overhead. Organizations face high replacement costs, lack of audit records, and continuous friction regarding whether assets were actually distributed.

PROVEXA provides a comprehensive solution by:
* **Enforcing Quotas Automatically**: Systematically blocking duplicate or invalid allocations based on employee metadata.
* **Creating Digital Handover Proof**: Generating signed, time-stamped proof sheets displaying the scanned card's OCR details and captured signatures.
* **Streamlining Expense Auditing**: Logging additional or lost assets against a corporate price list to automatically compile payroll deduction reports.
* **Simplifying Regulatory Audits**: Providing instant, digital compliance reports for health, safety, and environment (HSE) auditors.
* **Maximizing On-Site Portability**: Decoupling the heavyweight PyTorch OCR service as an independent microservice, allowing fast execution on low-cost tablet devices across local networks.

---

## 3. Business Problem Statement

Traditional asset distribution in large enterprises suffers from severe operational bottlenecks:
* **Asset Shrinkage & Loss**: Lack of signed verification records leads to high equipment loss. Employees frequently claim they never received their items, leading to expensive double-issuances.
* **Manual Record Bottlenecks**: Managing store handovers on paper registers makes it impossible to enforce renewal schedules (e.g., boots renewed every 365 days; safety helmets every 730 days).
* **Policy Integration Chaos**: Complex enterprise distribution guidelines—such as unique allocations for Union Operators, alternative Chudidhar options for female operators, and departmental safety shoe rules—are difficult to manage manually.
* **Manual Payroll Coordination**: Calculating and compiling wage deductions for lost assets, extra requests, or chargeable exchanges is manual, slow, and prone to leakage.

---

## 4. Solution Overview

PROVEXA solves these problems through a distributed client-server ecosystem:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              PROVEXA UI                                │
│                   (React.js + Tailwind CSS + Vite)                     │
└────────┬───────────────────────────────────────────────────────▲───────┘
         │                                                       │
         │ 1. Captures ID Badge Frame & Handover Signature       │ 4. Renders Time-Stamped Proof
         │                                                       │
┌────────▼───────────────────────────────────────────────────────┴───────┐
│                     CORE BACKEND / API GATEWAY                         │
│                    (Node.js + Express + Nodemon)                       │
└────────┬───────────────────────────────┬───────────────────────────────┘
         │                               │
         │ 2. Proxies base64 Image Frame │ 3. Queries / Persists Transactions
         │                               │
┌────────▼─────────────────────┐ ┌───────▼──────────────────────────────┐
│       OCR MICROSERVICE       │ │             DATABASE                 │
│ (FastAPI + OpenCV + EasyOCR) │ │ (SQL Server Express + Sequelize ORM) │
└──────────────────────────────┘ └──────────────────────────────────────┘
```

1. **Enterprise Frontend**: A responsive React single-page application (SPA) optimized for mobile/tablet browsers.
2. **Core API Gateway**: A Node.js Express server managing validation middleware, security whitelists, cron schedules, and file storage.
3. **Computer Vision Microservice**: A fast FastAPI service running OpenCV and EasyOCR to process badge scans.
4. **Relational Storage**: SQL Server Express utilizing Sequelize ORM for transactional safety and automatic migrations.

---

## 5. Key Features

* **AI-Powered Identity Verification**: Uses live badge OCR scanning and text matching to verify employee identity before issuing items.
* **HTML5 Canvas Signatures**: Captures electronic signatures in real time, saving them directly as compressed image files linked to transaction records.
* **Rule-Based Quota Engine**: Enforces specific allowances based on tenure (such as first-90-day Joining Kits) and designation (such as specialized safety gear).
* **Return & Renewal Action Centers**: Automatically computes future renewal deadlines and logs the condition of returned assets (Good, Damaged, Salvaged).
* **Exchange & Replacement Workflow**: Tracks asset exchanges for size adjustments or damages, enforcing old-asset returns prior to new handovers.
* **Payroll Deduction Integration**: Matches chargeable assets against price lists, logging employee-signed deductions for simple HR export.
* **Bulk Asset Distribution**: Allows storekeepers to issue multiple items to large groups of employees with dynamic double-issue warnings.
* **Styled Excel Export System**: Streams formatted, filtered spreadsheets directly to administrators for rapid business reports.

---

## 6. Core Modules

```
                    ┌───────────────────────────────────────┐
                    │            PROVEXA MODULES            │
                    └───────────────────┬───────────────────┘
                                        │
     ┌───────────────────┬──────────────┼──────────────┬───────────────────┐
     ▼                   ▼              ▼              ▼                   ▼
┌──────────┐       ┌───────────┐  ┌───────────┐  ┌───────────┐       ┌───────────┐
│ Employee │       │   Item    │  │  Handover │  │ Lifecycle │       │ Financial │
│ Directory│       │  Catalog  │  │ Verification││ Management│       │ Reporting │
└──────────┘       └───────────┘  └───────────┘  └───────────┘       └───────────┘
```

* **Employee Directory**: Manages active rosters, designations, sizes (shirt, pant, shoes), gender, and union status.
* **Item Master Catalog**: Tracks inventory, categories, cost metrics, and custom validity schedules (frequency-based or fixed calendar dates).
* **Handover & Verification**: Houses the live video scanner, coordinates canvas tracking, and manages verification logs.
* **Lifecycle Management**: Tracks active holdings, handles replacement requests, processes exchanges, and monitors returns.
* **Financial & Reporting**: Aggregates dashboard metrics and drives server-side Excel exports.

---

## 7. Technology Stack

| Tier | Component / Library | Version | Operational Purpose |
| :--- | :--- | :--- | :--- |
| **Frontend** | React.js (Vite) | `^18.3.1` | Renders the single-page application shell and handles view states. |
| **Styling** | Tailwind CSS | `^3.4.17` | Standardizes layouts, dark/light cards, and responsive grids. |
| **State Caching**| TanStack Query (React Query) | `^5.99.0` | Manages backend state sync, query invalidation, and cached updates. |
| **Core Server** | Node.js / Express | `^20.x` / `^5.2.1` | Serves as the API Gateway, routes requests, and manages middleware. |
| **Database ORM** | Sequelize ORM | `^6.37.8` | Handles object-relational mapping, transaction controls, and migrations. |
| **Database** | SQL Server Express | Local Engine | Secure, ACID-compliant relational storage using SQL logins. |
| **OCR Gateway** | FastAPI (Python) | `^0.110.x` | Asynchronous Python server hosting computer vision pipelines. |
| **Image Process**| OpenCV (Python) | Headless | Handles image adjustments, resizing, contrast filters, and binarization. |
| **OCR Engine** | EasyOCR (PyTorch base) | `^1.7.1` | Performs character recognition using neural network models. |
| **Excel Engine** | ExcelJS / XLSX | `^4.4.0` | Creates, formats, and streams corporate spreadsheets. |

---

## 8. Frontend Architecture

The React.js frontend is built on a single-page application framework designed for high speed and touch compatibility:
* **Nested Router Shell**: Managed by `react-router-dom` using layouts that bundle sidebars, headers, and dynamic notifications. Access to routes is restricted by a security check that calls `/api/auth/me`.
* **TanStack Server State Caching**: Eliminates unnecessary API loading by maintaining local caching layers. Action triggers (such as acknowledging an asset issue) automatically invalidate corresponding keys, keeping UI metrics and tables updated instantly.
* **Tailwind CSS UI Kit**: Utilizes responsive grids, smooth hover transitions, micro-animations, and styled status badges suited for tablet displays.
* **Signature Capture Engine**: Leverages standard HTML5 canvas coordinates, generating raw vector paths converted into compressed base64 strings.

---

## 9. Backend Architecture

The Express server acts as a centralized **Controller-Service-Model** gateway:
* **Controller Interceptors**: Extract parameters, validate input shapes, and return standard JSON outputs.
* **Business Services**: Implement modular transactional logic, interact with the ORM, and manage database isolation.
* **Strict CORS Rules**: Implements whitelists that validate browser headers against localhost URLs and private local subnet IPs (using custom regex matching `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`).
* **Session Cookie Authentication**: Uses signed JSON Web Tokens (JWT) stored in secure, `HttpOnly` cookie layers to block client-side access and prevent cross-site scripting (XSS) risks.

---

## 10. Database Architecture

PROVEXA utilizes **Microsoft SQL Server Express** managed via the Sequelize ORM:
* **Transactional Controls**: Critical asset movements (such as renewals and returns) run within database transactions to ensure database rollback if any query fail.
* **Auto-Schema Migrations**: On startup, the database service checks the existing schema and applies updates automatically without data loss (e.g. adding columns like `grade` or mapping `ReplacementRequests` values):
  ```javascript
  // Example of automated column additions during database load
  await sequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'grade')
      BEGIN
          ALTER TABLE Employees ADD grade NVARCHAR(255) NULL;
      END
  `);
  ```
* **Relational Mapping Model**: Formulates structural joins between `Employees`, `Items`, `IssueRecords`, and `ReplacementRequests`. Categories and prices are kept separated, while snapshot fields preserve historical names if catalog values change.

---

## 11. OCR Microservice Architecture

The computer vision engine is isolated in an independent **FastAPI Python microservice** to maximize performance and decouple heavy dependencies:
* **Decoupled System Loading**: Separating Python dependencies like PyTorch and OpenCV prevents memory spikes from affecting core Express transaction APIs.
* **Startup Model Initialization**: Loads EasyOCR model weights (`easyocr.Reader`) into system RAM exactly **once at startup**. Subsequent scans reuse the pre-warmed memory model, avoiding initialization lag.
* **CPU Model Quantization**: Employs weight quantization (`quantize=True`) to convert PyTorch float models into lightweight 8-bit matrices. This keeps the OCR fast and stable on standard, non-GPU laptop processors.

---

## 12. OCR Verification Workflow

When an employee badge is scanned, PROVEXA executes a rapid, multi-stage computer vision pipeline:

```
  React Video Capture ──► base64 Frame ──► Express Gateway ──► FastAPI Service
                                                                    │
  ┌─────────────────────────────────────────────────────────────────┘
  ▼
OpenCV Preprocessing Steps:
  1. Crop 5% Outer Boundary (removes background fingers/noise).
  2. Scale down longest side to 600px (decreases pixel density, speeding up CPU pass by 700%).
  3. Generate Dual Processing Images:
     * Image A: CLAHE Color (LAB space contrast optimization for colored cards).
     * Image B: Sharpened Otsu Binarization (preserves thin characters like '1' or '7').
  │
  ▼
PyTorch Inference (EasyOCR Engine):
  * Restricts characters strictly to digit formats using: allowlist='0123456789'.
  * Skips processing letters and punctuation, reducing search space by 60%.
  │
  ▼
Clean-Up & Match Engine:
  * Merges adjacent bounding boxes (combines split boxes, e.g. "1133" and "3" into "11333").
  * Corrects common digit recognition errors (substitutes letters like 'O' to '0', 'l' to '1').
  * Matches final text patterns using regular expressions and returns the verified code.
```

---

## 13. Digital Signature Workflow

The digital signature system provides an intuitive, touchscreen-compatible handover proof:

```
 ┌───────────────────────┐      base64 String     ┌───────────────────────┐
 │ React HTML5 Canvas    ├───────────────────────►│ Express API Server    │
 │ Mouse/Touch Capture   │                        │ (Decodes Data)        │
 └───────────────────────┘                        └──────────┬────────────┘
                                                             │
                                                             ▼
 ┌───────────────────────┐     Public URI URL     ┌───────────────────────┐
 │ Save in Database      │◄───────────────────────┤ Write to Local Disk   │
 │ (signature_path)      │                        │ (/uploads/signatures/)│
 └───────────────────────┘                        └───────────────────────┘
```

1. **Capture**: The user signs directly inside a signature pad within a modal dialog.
2. **Export**: Converts drawing coordinates into a compressed base64 PNG string.
3. **Persist**: The Express server decodes the string and writes a file named with a unique UUID to disk at `server/public/uploads/signatures/`.
4. **Reference**: Saves the file path (e.g. `/public/uploads/signatures/verify-xxx.png`) in the database record, linking the signature to the transaction.

---

## 14. Asset Allocation Workflow

PROVEXA enforces strict company policies via its integrated quota calculator. The rules are structured as follows:

### I. Uniform Quotas
* **New Joining Kit**: Automatically applies to all employees (including Trainees and Interns) during their first 90 days. Allocates **3 Pants, 2 Shirts, 1 T-Shirt, and 2 Socks**.
* **Annual Allocation**: Applies to permanent staff after 90 days, resetting on their anniversary date. Allocates **2 Pants, 2 Shirts, 1 T-Shirt, and 2 Socks**.
* **Attire Swap Policy**: Female staff can opt for alternative attire, which automatically swaps standard Pants for Chudidhar Bottoms, Shirts for Chudidhar Tops, and T-Shirts for Chudidhar Coats.

### II. Footwear Allocations
* **Trainees/Interns**: Eligible for standard **Safety Shoes**.
* **Supervisors/Union Operators**: Eligible for upgraded **Liberty Shoes**.
* **Operational Departments** (Production, Maintenance, Quality, Stores, Shop Floor): Eligible for standard **Safety Shoes** for safety compliance.
* **Corporate / Other Departments**: Allocated corporate **Bata Shoes**.
* *All shoe allocations are restricted to 1 pair per year.*

### III. Union Linen & Welfare Benefits
* **Union Members Linen Program**: Union members are eligible for quarterly linen distributions:
  * **Q1 (Jan–Mar)**: Turkey Towel.
  * **Q2 (Apr–Jun)**: 3-Piece Towel Set.
  * **Q3 (Jul–Sep)**: Bedsheet.
  * **Q4 (Oct–Dec)**: 3-Piece Towel Set.
* **Standard Soap Allotments**: Non-union operators receive a quarterly soap allocation (3 soaps per quarter for the first 3 months, 4 soaps per quarter thereafter) up to an annual limit of 45 soaps.
* **Sweet Box Program**: Standard employees receive 1 sweet box per event (e.g. New Year, Ayudha Pooja). Union members receive 1 additional bonus box.
* **Wellness Allotment**: Distributes 1 KG of Boost to any employee following a verified blood donation.

---

## 15. Reporting & Excel Export System

The reporting framework compiles and streams customized spreadsheets using `exceljs` and `xlsx`:
* **Dynamic Parameter Filters**: Filters records on the backend using query parameters (such as department, date range, verification method, and request status).
* **High-Density Spreadsheet Compilation**: Generates customized tables with styled headers, auto-fit columns, and correct data formats.
* **Streaming Binary Response**: Streams the compiled workbook directly to the browser as a binary blob with a date-stamped filename, ensuring fast downloads.

---

## 16. Authentication & JWT Flow

1. **Login Request**: The admin enters credentials, and the backend verifies the username and validates the password using `bcryptjs` with 10 hashing rounds.
2. **Session Signature**: Generates a secure JSON Web Token (JWT) signed with a secure, random environment key, configuring a standard 24-hour expiration.
3. **Cookie Security**: Transmits the token inside an `HttpOnly`, `Secure` SameSite cookie. This blocks client-side scripts from reading the token, protecting it against Cross-Site Scripting (XSS) attacks.
4. **Validation Middleware**: Subsequent API requests verify the cookie token. If the token is invalid or expired, the middleware clears the cookie and redirects the user to the login screen.

---

## 17. API Gateway Concept

The Express server acts as a unified secure proxy for the frontend:
* **Consolidated Endpoints**: Serves all routes under Port 5000, masking the internal ports used by the Python OCR service.
* **Network Boundary Controls**: The FastAPI service only accepts connections from the local loopback host, protecting it from external network traffic.
* **Whitelisted Security**: The gateway enforces authentication on all scanning routes, blocking unauthenticated users from accessing the OCR microservice.

---

## 18. Mobile & Tablet Support

PROVEXA is optimized for on-the-go warehouse operations:
* **Responsive Layout Grid**: Built using responsive Tailwind flex-box and grid systems, adapting automatically to different screen sizes.
* **Touch-Friendly Controls**: Features larger button click surfaces and simplified navigation tables suited for mobile devices.
* **Responsive Video Scanner Overlay**: Adjusts the camera overlay and viewport dynamically to match device screen heights and ratios.

---

## 19. Mobile Camera Permission Setup

Modern mobile browsers enforce strict security rules that block camera access on unsecured connections. To access the camera on mobile devices during local testing, follow these configuration steps:

### I. Security Rules (HTTPS vs HTTP)
Browser camera APIs (`navigator.mediaDevices.getUserMedia`) require a secure connection (**HTTPS** or **localhost**). If you access the application using a local IP address (e.g., `http://192.168.1.15:5173`) over standard HTTP, the browser will disable the camera.

### II. Configuring Local IP Camera Access in Chrome (Android)
To test the camera on Android devices without configuring SSL certificates, bypass the browser security check in Chrome:
1. Open Chrome on the Android device and navigate to: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. Enable the setting and enter the host laptop's local IP and port in the text box (e.g., `http://192.168.1.15:5173`).
3. Tap **Relaunch** at the bottom of the screen to apply the changes. The browser will now treat the local address as secure and allow camera access.

### III. Configuring Camera Access in Safari (iOS / iPhone / iPad)
1. Open the **Settings** app on the iOS device, scroll down, and select **Safari**.
2. Scroll to the bottom and select **Advanced** -> **Experimental Features** (or **Feature Flags** in iOS 17+).
3. Search for and enable **Media Recorder** and **getUserMedia** permissions.
4. When you open the application, tap **Allow** on the camera access pop-up dialog.

---

## 20. Local Network / LAN Access Setup

To run PROVEXA across a local area network (LAN), allowing supervisors to issue assets directly on tablets while walking the shop floor:

### Step 1: Connect to the Same Network
Ensure the host laptop and the mobile or tablet devices are connected to the **same Wi-Fi network**.

### Step 2: Bind Vite to the Local Network
Configure Vite to listen on the local network by adding the `--host` flag in `client/package.json`:
```json
"dev": "vite --host"
```

### Step 3: Find the Host Laptop's Local IP Address
1. Open a command prompt or terminal on the host laptop.
2. Run the network configuration command:
   ```bash
   ipconfig
   ```
3. Locate the **IPv4 Address** under your active network adapter (e.g., `192.168.1.15`).

### Step 4: Access the Application
Open the browser on the mobile or tablet device and enter the host laptop's IP address and port:
* **Frontend Web Access**: `http://192.168.1.15:5173`
* **Backend API Gateway**: `http://192.168.1.15:5000`

---

## 21. Production Deployment Architecture

```
                          INCOMING USER INTERNET / LAN TRAFFIC
                                           │
                                           ▼
                            MICROSOFT IIS (Ports 80 / 443)
                                           │
                ┌──────────────────────────┴──────────────────────────┐
                ▼ Static React Assets                                 ▼ REST API Proxy
        [Pre-built Static Files]                              [iisnode Redirects]
                                                                      │
                                                                      ▼
                                                              Express Gateway
                                                                (Port 5000)
                                                                      │
                                              ┌───────────────────────┴───────────────────────┐
                                              ▼ SQL Queries                                   ▼ OCR Scan Tasks
                                       [SQL Server Express]                             [FastAPI Microservice]
                                           (Port 1433)                                       (Port 8001)
```

1. **Incoming Traffic**: Microsoft IIS processes incoming user requests on standard HTTP/HTTPS ports (ports 80 and 443).
2. **React Routing**: IIS serves the static React application files directly to clients.
3. **Express API Processing**: IIS proxies backend API requests (`/api/*`) to the Express service using `iisnode`.
4. **System Services**: The Express service queries SQL Server on Port 1433 and forwards card scanning tasks to the FastAPI service running in the background on Port 8001.

---

## 22. SQL Server + PM2 + IIS Explanation

Deployments on Windows Server use a robust, production-ready process layout:
* **Internet Information Services (IIS)**: Serves as the web gateway. It hosts the static React client build and routes API calls to the background Node service using the `iisnode` extension.
* **PM2 Process Manager**: Runs the backend Node service in the background, automatically restarting the process if it encounters unhandled exceptions or crashes.
* **SQL Server Express**: Runs as a local service listening on Port 1433, providing database transaction safety and secure storage for relational tables.

---

## 23. Deployment Steps on Another Laptop

Follow these steps to deploy and run PROVEXA on another laptop:

### Step 1: Install Required Software
Ensure the destination laptop has the following software installed:
* **Node.js (v20 or higher)**
* **Python (v3.10 or v3.11)** (Check the option to **"Add Python to PATH"** during installation)
* **SQL Server Express** and **SQL Server Management Studio (SSMS)**

### Step 2: Obtain the Source Code
You can transfer the project folder using a ZIP archive or clone it directly using Git:

#### Option A: Extracting from a ZIP Archive
Copy the `PROVEXA_Source.zip` file to the target machine and extract the contents to a target folder (e.g. `C:\PROVEXA`).

#### Option B: Cloning the Repository
Open a terminal and clone the repository using Git:
```bash
git clone <repository_url> PROVEXA
cd PROVEXA
```

---

## 24. SQL Backup & Restore

Prepare the database before starting the application. If you have a `.bak` backup file:

### How to Create a `.bak` Backup
To back up the database on your development machine, run the following command in SSMS:
```sql
BACKUP DATABASE ProvexaDB_New
TO DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH FORMAT,
     MEDIANAME = 'SQLServerBackups',
     NAME = 'Full Backup of ProvexaDB_New';
GO
```

### How to Restore the Database
To restore the database on the new machine:
1. Place the backup file (`.bak`) in a folder (e.g., `C:\Backups\ProvexaDB_Backup.bak`).
2. Open SSMS on the new laptop, open a new query window, and run the restore script:
```sql
USE master;
-- Set database to single-user mode to close active connections
ALTER DATABASE ProvexaDB_New SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

-- Restore database from the backup file
RESTORE DATABASE ProvexaDB_New
FROM DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH REPLACE,
     RECOVERY;

-- Return database to multi-user mode
ALTER DATABASE ProvexaDB_New SET MULTI_USER;
GO
```
3. Create a SQL Login for the user:
   * Create a new SQL login named `provexa_user` with password `Provexa@123`. Map the user to the `ProvexaDB_New` database and assign **db_owner** permissions.

---

## 25. Environment Variables

Configure the environment variable configuration files in the respective project directories:

### Server Configuration (`server/.env`)
Create a new `.env` file in the `server/` directory and configure the database settings:
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=428d75fa638e918bc27c65ef49aef50bca90fcf63297a7a51d4513
SQL_SERVER=127.0.0.1
SQL_PORT=1433
SQL_DATABASE=ProvexaDB_New
SQL_USER=provexa_user
SQL_PASSWORD=Provexa@123
SQL_DIALECT=mssql
```

### Client Configuration (`client/.env`)
Create a new `.env` file in the `client/` directory and configure the backend URL:
```env
VITE_API_URL=http://localhost:5000
```

---

## 26. Installation Steps

### Step 1: Install Node.js Dependencies
Install the required Node.js packages for both the backend and frontend:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 2: Configure the Python virtual environment
Set up a Python virtual environment and install the required machine learning dependencies:
```bash
# Navigate to the OCR service directory
cd ../ocr_service

# Create a new virtual environment
python -m venv venv

# Activate the virtual environment
# Windows CMD:
venv\Scripts\activate.bat
# Windows PowerShell:
venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```
*(Note: Installing the requirements downloads PyTorch and the EasyOCR English language model weights on first run, which may take a few minutes).*

---

## 27. Running the Entire System

To run the application, open three separate terminal windows and start the services in order:

### Terminal 1: Python OCR Service
Launch the machine learning API on Port 8001:
```bash
cd ocr_service
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Terminal 2: Express Backend Server
Launch the REST API gateway on Port 5000:
```bash
cd server
npm run dev
```

### Terminal 3: Vite Frontend Client
Launch the React development server:
```bash
cd client
npm run dev
```

### Quick Launcher
Alternatively, double-click the **`start_provexa.bat`** file in the project's root folder to automatically launch all three services.

---

## 28. API Endpoints

| Method | Endpoint | Description | Authentication | Payload Fields |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Authenticate administrator credentials. | Public | `{ email, password }` |
| **POST** | `/api/auth/logout` | Clear active admin cookie sessions. | Secure | None |
| **GET** | `/api/auth/me` | Fetch active user session profiles. | Secure | None |
| **GET** | `/api/employees` | Search and paginate employee records. | Secure | Query: `?page=x&search=y` |
| **POST** | `/api/employees` | Create a new employee record. | Secure | `{ emp_code, name, department, designation, employee_type, gender, sizes }` |
| **GET** | `/api/employees/:id/asset-profile` | Fetch employee asset profiles and quotas. | Secure | None |
| **POST** | `/api/issues` | Distribute assets in bulk. | Secure | `{ employee_ids: [], item_payloads: [], issued_date }` |
| **PUT** | `/api/issues/acknowledge/:id` | Confirm single asset handovers. | Secure | `{ method, signature, ocr_details }` |
| **POST** | `/api/issues/:id/renew` | Renew an active asset cycle. | Secure | `{ notes, item_condition }` |
| **POST** | `/api/issues/:id/return` | Mark an issued asset as returned. | Secure | `{ returned_condition, remarks }` |
| **POST** | `/api/replacements` | Request additional/exchange items. | Secure | `{ employee, item, allocation_type, reason, quantity, size }` |
| **PUT** | `/api/replacements/:id/approve` | Approve replacement cost. | Secure | `{ unit_cost, notes }` |
| **GET** | `/api/reports/export` | Download issue reports (.xlsx). | Secure | Query parameters for filters |

---

## 29. Troubleshooting

* **Error: `ConnectionError: Port 1433 not open`**
  * *Reason*: SQL Server is not accepting TCP/IP connections, or the service is not running.
  * *Solution*: Open **SQL Server Configuration Manager**, navigate to **Protocols for SQLEXPRESS**, right-click **TCP/IP**, and click **Enable**. Restart the SQL Server service in Windows Services.

* **Error: `EasyOCR download timed out`**
  * *Reason*: Internet connection timed out while downloading model weights on first run.
  * *Solution*: Ensure the laptop has an active internet connection on first run to allow PyTorch to download and cache the weight files in the user profile directory (`~/.EasyOCR/`).

* **Error: `Port 8001 already in use`**
  * *Reason*: Another background instance of the FastAPI service is running.
  * *Solution*: Double-click the **`ocr.bat`** file in the root folder. The batch script automatically kills any process running on Port 8001 before starting the service.

* **Error: `Audit Logs Disabled / Upload Directory Missing`**
  * *Reason*: The server lacks permissions to write files to the uploads directory.
  * *Solution*: Verify that the target folder `server/public/uploads/signatures/` exists on disk and has read/write permissions enabled for the current system user.

---

## 30. Windows Deployment Notes

* **Execution Policy Configuration**: If PowerShell blocks virtual environment scripts, open a PowerShell terminal as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
  ```
* **Directory Upload Permissions**: Verify the `server/public/` folder allows read and write permissions to let the Express server write signature images.
* **Enable Git Long Paths**: If Git throws errors regarding deep directories on Windows, run the configuration command:
  ```bash
  git config --global core.longpaths true
  ```

---

## 31. Future Enhancements

* **LDAP & Active Directory Support**: Allow administrators to log in using standard corporate Active Directory credentials.
* **RFID Smart-Badge Integration**: Enable contactless issuing by replacing standard camera scans with fast RFID card reads.
* **Predictive Inventory Modeling**: Analyze historical asset distribution data to help stores predict inventory requirements before upcoming cycles.

---

## 32. Screenshots

*Below are placeholders to capture the visual interfaces of the running system:*

#### I. Dashboard Interface
*(Displays active inventory analytics, active handovers, pending replacements, and recent allocation trends).*
> **[Placeholder for Dashboard Screenshot]**

#### II. OCR Verification Modal
*(Displays the live camera viewport overlay, captured card preview, and target matching indicators).*
> **[Placeholder for OCR Scan Modal Screenshot]**

#### III. Employee Profile Screen
*(Displays active allocations, remaining quotas, historical timeline, and payroll additional cost cards).*
> **[Placeholder for Employee Profile Screenshot]**

#### IV. Replacement Workflow Drawer
*(Displays cost calculations, replacement reasons, and verification fields).*
> **[Placeholder for Replacement Drawer Screenshot]**

#### V. Reports Export Center
*(Displays parameter selection filters, date pickers, and export action buttons).*
> **[Placeholder for Reports View Screenshot]**

---

## 33. Conclusion

**PROVEXA** provides a secure, efficient, and modern approach to enterprise asset management. By integrating computer vision-based badge scanning and touchscreen signature capture, it replaces manual logs with a zero-trust digital audit trail. 

Built on a decoupled client-server architecture, transactional database storage, and lightweight CPU processing, PROVEXA is an ideal, presentation-ready solution for final year projects, technical viva sessions, and enterprise-scale deployments.
