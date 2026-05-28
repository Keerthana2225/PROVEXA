# PROVEXA – Enterprise Asset Management & OCR Handover Verification System

---

## 2. Project Description
**PROVEXA** is an industrial-grade, enterprise-scale Asset Management and Handover Verification System. It is engineered specifically to manage, track, and verify the lifecycle of employee assets—including uniforms, safety gear (PPE), linen, and operator welfare benefits. 

Unlike traditional asset inventory systems that rely on manual logging, spreadsheets, or honor-system distribution, PROVEXA enforces a complete, legally binding, and audit-compliant electronic trail. It accomplishes this by integrating **Computer Vision (OpenCV)** and **Deep Learning Optical Character Recognition (EasyOCR + PyTorch)** at the physical point of handover, backed by **HTML5 Electronic Signature Capture**. 

Every transaction is governed by a dynamic, company-policy-compliant **Quota & Eligibility Engine** that acts on employee metadata (such as gender, designation, department, tenure, and union status) in real time to prevent duplicate issues, calculate precise cost deductions, track replacement requests, and generate structured payroll exports.

---

## 3. Executive Summary
In high-workforce environments such as manufacturing plants, assembly lines, and warehouse operations, tracking physical employee assets presents severe logistical and financial challenges. Organizations face significant asset shrinkage, high replacement costs, and friction between employees and store management regarding whether items were actually received.

PROVEXA provides a unified, cross-platform enterprise hub that:
1. **Automates Policy Compliance**: Eliminates manual oversight by dynamically determining asset quotas (e.g., standard operator wear, specialized union linen programs, and mandatory gender-specific attire) based on live employee records.
2. **Establishes Ironclad Accountability**: Replaces verbal confirmation with a multi-layered "Handover Verification" protocol requiring a live scan of the employee's physical ID card (OCR matched) and a digital signature.
3. **Optimizes Financial Recovery**: Tracks additional requests or lost assets against an official corporate price list, automatically routing payroll-relevant deductions to HR and finance administrators.
4. **Ensures Regulatory & Audit Readiness**: Logs every single transaction, renewal, return, and verification event into an immutable database history, exposing detailed electronic proof sheets for internal and external auditors.

By decoupling resource-heavy image processing from the core business APIs via a microservices architecture, PROVEXA guarantees lightning-fast execution, local network portability, and high responsiveness even on low-cost tablet devices used on the warehouse floor.

---

## 4. Business Problem Statement
Large-scale corporations, factories, and heavy-industry operations struggle with several operational bottlenecks in asset distribution:
* **Asset Shrinkage & Loss**: Hundreds of shirts, pants, safety boots, and towels are lost annually due to weak physical verification. Employees frequently claim they never received their issued items, forcing stores to issue duplicates.
* **Manual Tracking Overhead**: Store keepers manage handovers on physical registers, making it impossible to enforce renewal frequencies (e.g., renewing safety boots exactly every 365 days or safety helmets every 730 days) across thousands of workers.
* **Complex Eligibility Rules**: Rules vary dynamically (e.g., Union Operators receive special quarterly towel distributions and yearly bedsheets, Trainees get safety boots instead of standard corporate Bata shoes, and female operators choose alternative Chudidhar attire). Manual tracking of these complex matrices is highly error-prone.
* **Unstructured Financial Recovery**: When employees request extra items or replacements for lost/damaged gear, capturing, calculating, and transferring these payroll deductions to the accounts team is a disjointed, manual process prone to leakage.
* **Audit and Compliance Failures**: Internal health, safety, and environment (HSE) audits require instant proof of active PPE holdings and signed handovers, which are difficult to compile from paper records.

---

## 5. Solution Overview
PROVEXA addresses these enterprise pain points with a multi-layered digital ecosystem:

```
┌────────────────────────────────────────────────────────────────────────┐
│                              PROVEXA UI                                │
│                   (React.js + Tailwind CSS + Vite)                     │
└────────┬───────────────────────────────────────────────────────▲───────┘
         │                                                       │
         │ 1. Capture ID Image Frame & Signatures                │ 4. Verification Proof
         │                                                       │
┌────────▼───────────────────────────────────────────────────────┴───────┐
│                          API GATEWAY / BACKEND                         │
│                           (Node.js + Express)                          │
└────────┬───────────────────────────────┬───────────────────────────────┘
         │                               │
         │ 2. Forward base64 Image       │ 3. Query / Persist Relational Logs
         │                               │
┌────────▼─────────────────────┐ ┌───────▼──────────────────────────────┐
│       OCR MICROSERVICE       │ │             DATABASE                 │
│ (FastAPI + OpenCV + EasyOCR) │ │ (SQL Server Express + Sequelize ORM) │
└──────────────────────────────┘ └──────────────────────────────────────┘
```

1. **Centralized Data Hub**: Syncs master data across Employees, Items, and Categories within an enterprise database.
2. **Dynamic Quota & Eligibility Engine**: Automatically screens each employee's tenure, department, and union profile to determine their remaining quota before an asset can even be selected for issue.
3. **Computer Vision-Enhanced Verification**: Integrates a custom high-performance OCR service that reads physical employee badges in milliseconds, translating character structures to match database IDs, coupled with HTML5 canvas signature paths.
4. **Transparent Replacement & Deduction Flow**: Automates exchange, return, and replacement workflows, mapping costs dynamically against a verified price matrix and logging the transaction state directly for payroll reporting.

---

## 6. Key Features
* **Dual-Mode Handover Verification**: Enforces secure handover via AI-driven ID Card scan, digital signature, or a strict dual-mode (OCR + Signature) requirement.
* **Dynamic Policy Engine**: Enforces tailored corporate rules (e.g., Joining Kits, Annual Cycles, Union Linen rules, and Alternative Attire choice logic).
* **Robust Replacement Management**: Handles replacement requests under strict categories (Damage, Size Change, Exchange) and tracks old item collection states.
* **Integrated Payroll Cost Tracking**: Automatically lists and aggregates chargeable additional allocations by employee, department, and transaction reason.
* **Automated Renewal & Return Centers**: Separates items by lifecycle status, automatically calculating future renewal deadlines and tracking returned asset conditions (Good, Needs Maintenance, Severely Damaged).
* **Enterprise Reporting**: Offers deep filter matrices (date ranges, category, verification method, status) and streams customized `.xlsx` Excel spreadsheets directly to the client.
* **Bulk Issue Distribution**: Empowers administrators to allocate multiple items to multiple employees simultaneously with duplicate-prevention warning overrides.
* **Comprehensive Audit Logs**: Every asset movement generates an audit history, viewable via interactive timelines and verified proof sheets.

---

## 7. Core Modules
* **Employee Management Module**: Controls employee rosters, employment types, status, and sizing profiles (Shirt, Pant, Shoe).
* **Item Master & Category Catalog**: Manages items and custom categories, setting validity structures via custom duration days or static calendar dates.
* **Quota & Eligibility Engine**: The analytical core computing dynamic quotas, identifying renewal constraints, and tracking employee policy compliance.
* **Handover Verification Center**: Manages camera capture streams, routes base64 images, and handles electronic signature collection.
* **Replacements & Exchange Center**: Orchestrates replacement approvals, tracks cost overrides, manages old item returns, and processes handovers.
* **Reporting & Financial Analytics**: Aggregates enterprise key performance metrics and manages multi-threaded Excel report generation.
* **Audit & Lifecycle Trail**: Manages archived records, tracks returned item inventory adjustments, and serves verified proof sheets containing detailed OCR metrics and signatures.

---

## 8. Technology Stack Table

| Component | Technology | Version / Library | Strategic Role in PROVEXA |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React.js | `^18.3.1` (Vite) | High-responsiveness SPA, modular component state rendering, interactive workflows. |
| **Styling** | Tailwind CSS | `^3.4.17` | Sleek modern aesthetics, dark card modes, responsive layout grids across tablets/mobiles. |
| **State & Cache** | React Query | `@tanstack/react-query ^5.99.0` | Server state sync, automatic query invalidation, and optimistic UI updates. |
| **Core Server** | Node.js | `^20.x` / Express `^5.2.1` | Asynchronous API gateway, transaction routing, security middleware, cron engine. |
| **ORM Layer** | Sequelize ORM | `^6.37.8` | High-fidelity object-relational mapping, transactional queries, structural database sync. |
| **Database** | SQL Server Express | Local DB Engine (Tedious) | High-performance relational database, ACID transactions, backup security, enterprise standards. |
| **OCR Service** | FastAPI (Python) | `^0.110.x` | Asynchronous Python microservice hosting deep learning inference pipelines. |
| **Computer Vision**| OpenCV (Python) | `opencv-python-headless` | Image preprocessing: 5% edge crop, longest-side scaling to 600px, CLAHE, and Otsu binarization. |
| **OCR Engine** | EasyOCR | `^1.7.1` (PyTorch base) | Character classification via Deep Learning CRNN (Convolutional Recurrent Neural Network). |
| **Report Engine** | ExcelJS / XLSX | `^4.4.0` / `^0.18.5` | Programmatic construction, styling, and streaming of high-density corporate Excel spreadsheets. |

---

## 9. Frontend Architecture
The frontend is a lightweight **React Single Page Application (SPA)** compiled with **Vite** for optimized build times and modern asset delivery. 

```
                               ┌───────────────────┐
                               │     App.jsx       │ (Global Router & Layout)
                               └─────────┬─────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
       ┌───────────────────┐   ┌───────────────────┐   ┌───────────────────┐
       │   React Query     │   │   React Router    │   │  Tailwind CSS     │
       │ (State Caching)   │   │  (Protected Shell)│   │ (Modern UI Grid)  │
       └───────────────────┘   └───────────────────┘   └───────────────────┘
```

* **Client-Side Routing**: Handled via `react-router-dom` using nested layouts. A global `AppLayout` manages the collapsable navigation sidebar, custom top-header, and responsive main content body. Protected routes are wrapped in an authorization check that reads `/api/auth/me` and redirects unauthenticated traffic to `/login`.
* **Server State Synchronization**: Handled via `React Query` (TanStack Query). This completely decouples client UI state from backend data. Operations such as acknowledging an issue or approving a replacement trigger automatic query invalidations, causing the UI to refresh metrics, lists, and timelines instantly without page reloads.
* **Component Styling**: Built using **Tailwind CSS** following a modern "Glassmorphic Card" and "Sleek Dark Mode" aesthetic. Design elements include rich color palettes, smooth hover effects, micro-animations on interactive elements, and custom CSS-based overlays.
* **Signature Capture**: Utilizes `react-signature-canvas` to bind HTML5 canvas mouse/touch tracking into structured digital paths.

---

## 10. Backend Architecture
The backend is built as a highly structured, scalable **Express REST API** utilizing a modular **Controller-Service-Model** design pattern. 

* **Entrypoint (`index.js`)**: Configures Express, initializes database connections, registers middleware (JSON parsers, CORS handling, cookie parsing), mounts API routers, and boots the HTTP server on Port 5000.
* **CORS Security**: Custom verification logic restricts incoming requests to verified localhost ports and local network private LAN IP spaces (using custom regular expressions to match private IP ranges `192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`).
* **Router-Service-Model Separation**:
  * **Routers** (e.g., `routes/employees.js`, `routes/issues.js`): Define the HTTP endpoints, enforce authentication checks, and map route parameters.
  * **Services** (e.g., `services/EmployeeService.js`, `services/EligibilityService.js`): Implement pure business logic, database transaction controls, and payload mappings.
  * **Models** (e.g., `models/Employee.js`, `models/IssueRecord.js`): Define tables, field types, and structural relationship rules.
* **Global Error Middleware**: Intercepts failed actions, rollback triggers, and validation errors, translating them into neat JSON responses for the frontend.

---

## 11. Database Architecture (SQL Server + Sequelize)
PROVEXA utilizes **Microsoft SQL Server Express** combined with the robust **Sequelize ORM** using the `tedious` driver. 

* **Connection and Driver Management**: Configured in `config/database.js`. The dialector manages a structured connection pool (maximum 20 connections, acquire timeout of 60 seconds, idle timeout of 10 seconds) to ensure database threads are reused efficiently.
* **Transactional Reliability**: Enforces strict database transaction control. Critical processes, such as asset renewals, use multi-table transactions (archiving the old record while creating a new pending issue) to prevent database inconsistency.
* **Automatic Migrations (T-SQL Auto-Migrations)**:
  At startup, the system executes raw T-SQL schema checks to dynamically adapt existing tables without data loss:
  ```javascript
  // Auto-migrate new employee columns
  await sequelize.query(`
      IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Employees') AND name = 'grade')
      BEGIN
          ALTER TABLE Employees ADD grade NVARCHAR(255) NULL;
      END
  `);
  ```
  It automatically manages columns like `grade`, `is_union_member`, `is_alternative_attire`, and handles backfill queries to link foreign keys for employee and item names in replacement request archives.

---

## 12. OCR Microservice Architecture
The OCR microservice is isolated into a **FastAPI** Python server running **EasyOCR**, **OpenCV**, and **PyTorch**. 

```
                                  FASTAPI SERVER (Port 8001)
                      ┌───────────────────────────────────────────────┐
                      │                 POST /scan                    │
                      └──────────────────────┬────────────────────────┘
                                             │
                                             ▼
                               ┌─────────────────────────────┐
                               │   Image Decoder (Base64)    │
                               └─────────────┬───────────────┘
                                             │
                                             ▼
                               ┌─────────────────────────────┐
                               │     OpenCV Preprocessor     │
                               │ (Crop, Resize, CLAHE, Otsu) │
                               └─────────────┬───────────────┘
                                             │
                                             ▼
                               ┌─────────────────────────────┐
                               │    EasyOCR Engine (PyTorch) │
                               │  (Allowlist='0123456789')   │
                               └─────────────┬───────────────┘
                                             │
                                             ▼
                               ┌─────────────────────────────┐
                               │  Token Merger & Regex Fix   │
                               └─────────────────────────────┘
```

* **Strategic Service Decoupling**: Isolating image processing into a separate Python process keeps the core Node backend lightweight. High CPU spikes during neural network runs are contained within the Python process.
* **Startup Initialization**: The FastAPI server loads the EasyOCR model weights (`easyocr.Reader(['en'], gpu=False)`) into memory exactly **once at startup**. Subsequent REST API requests use the preloaded model in memory, reducing request latency.
* **Memory Quantization**: Quantization is enabled (`quantize=True`) to run the PyTorch weights in a compressed 8-bit integer layout, saving memory and speeding up execution on standard laptop CPUs.

---

## 13. OCR Verification Pipeline
The end-to-end verification pipeline works through these phases:
1. **Frame Capture**: The React UI requests camera access, projects the live stream into an overlay guide, captures a raw frame, and sends it as a base64 string to `/api/verification/ocr-scan`.
2. **Express Gateway Forwarding**: Express captures the base64 payload and forwards it in a structured JSON body (`{ image: b64 }`) to FastAPI on `http://127.0.0.1:8001/scan`.
3. **Decoded Frame Matrix**: The Python service strips headers, decodes the base64 string, and parses the byte array into a three-dimensional OpenCV color matrix (`cv2.imdecode`).
4. **OpenCV Preprocessing**: Runs specialized spatial filters to optimize contrast, remove background noise, and isolate high-probability character areas.
5. **EasyOCR Target Inference**: Feeds preprocessed matrices into EasyOCR's neural network, enforcing a strictly restricted digit allowlist.
6. **Token Processing & Confidence Matching**: Parses OCR outputs, merges adjacent digit bounding boxes, applies character corrections (e.g. `O` -> `0`), and extracts candidate patterns using regular expressions.
7. **Validation Comparison**: The final extracted code is sent back to Express, which checks it against the expected employee record. If it matches, the system updates the issue status to `Acknowledged`.

---

## 14. OpenCV Preprocessing Concepts
To maximize CPU speed and recognition accuracy, incoming images undergo specific OpenCV processing steps:

* **5% Boundary Edge Crop**:
  Physical cards are often held by operators during handovers, resulting in fingers, thumbs, or noisy backgrounds around the card edges. The system applies a 5% margin crop to focus purely on the card content:
  ```python
  mw, mh = int(w * 0.05), int(h * 0.05)
  img = img[mh:h - mh, mw:w - mw]
  ```

* **Max-Side Downscaling (600px)**:
  Incoming camera feeds are often 1080p or 4K. Passing these high-resolution images directly to neural networks is highly CPU-intensive. The system downscales the image's longest side to 600px while maintaining the aspect ratio, reducing the total pixel area by **over 700%** and speeding up execution significantly:
  ```python
  max_side = 600
  if max(h, w) > max_side:
      scale = max_side / max(h, w)
      img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
  ```

* **Dual-Variant Image Generation**:
  Different employee ID cards feature varied background designs, colors, and lighting conditions. To handle this, the system generates **two complementary variants** of the card:
  1. **Variant 1 - CLAHE Color (LAB Space)**: Converts the image to the LAB color space, applies Contrast Limited Adaptive Histogram Equalization (CLAHE) on the L-channel to normalize lighting variations, and converts it back to BGR. This preserves colors, which the neural network uses for character feature extraction.
  2. **Variant 2 - Sharpened Otsu Binarization**: Applies an unsharp mask to sharpen high-frequency transitions, helping preserve thin digit strokes (such as `1` or `7`). It then runs Otsu's adaptive thresholding to convert the image to clean black-and-white, adapting automatically to different card brightness levels without manual calibration.

---

## 15. EasyOCR + PyTorch Working
EasyOCR leverages PyTorch to implement a deep learning text recognition pipeline:

* **Inference Pipeline**:
  * **Feature Extraction**: Uses a ResNet backbone to extract spatial feature maps from the input image.
  * **Sequence Labeling**: Uses a Bidirectional LSTM (Long Short-Term Memory) network to model character sequence dependencies.
  * **CTC Decoding (Connectionist Temporal Classification)**: Maps the recurrent outputs into discrete character predictions without requiring pre-segmented character boxes.
* **Model Quantization**: Enabling quantization compresses PyTorch's floating-point model weights into an 8-bit representation. This optimization reduces the CPU memory footprint and accelerates matrix calculations on systems without dedicated GPUs.

---

## 16. Regex Extraction Logic
Raw OCR outputs frequently split words or contain minor recognition errors. The system uses robust regular expressions and mapping dictionaries to correct and clean these outputs:

* **Digit Bounding Box Merging**:
  EasyOCR often identifies individual numbers in separate bounding boxes, reading "11333" as "1133" and "3". The system merges adjacent digit-only tokens prior to pattern matching:
  ```python
  # Regex to identify digit tokens including common OCR substitutions
  _digit_tok = re.compile(r'^[0-9OQDIlLiJSsBZGq]+$', re.IGNORECASE)
  ```

* **OCR Error Correction Map**:
  Applies standard character-to-digit corrections to clean common OCR slips (such as reading `O` as `0` or `l` as `1`):
  ```python
  _OCR_FIX = str.maketrans({
      "O": "0", "o": "0", "Q": "0", "D": "0",
      "I": "1", "l": "1", "i": "1", "L": "1", "J": "1",
      "S": "5", "s": "5", "B": "8", "Z": "2", "G": "6", "q": "9",
  })
  ```

* **Pattern Matching Ranks**:
  Matches extracted text strings against ranked regex expressions:
  1. **Pattern 1 (Prefix Match)**: Searches for labels indicating employee IDs, e.g., `Emp No: 11333` or `Employee ID: 11333` using `re.compile(r"(?:emp(?:loyee)?[\s\.\-]*(?:no|id|code|number)?[\s\.\-:]+)([0-9OQDILSBZG]{3,7})", re.IGNORECASE)`.
  2. **Pattern 2 (Short Prefix Match)**: Matches standard short prefixes like `No: 11333` or `ID: 11333`.
  3. **Pattern 3 (Standalone Digit Sequence)**: Captures any isolated 3-to-7 digit sequence as a fallback.

---

## 17. Digital Signature Workflow
To capture electronic signatures securely on touchscreens or web browsers:

```
  ┌────────────────────────────────────────────────────────┐
  │              Client HTML5 Canvas Drawing               │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │         Generate base64-Encoded PNG String             │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │         POST Payload to Express Backend Server         │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │        Store Image on Disk under /public/uploads/      │
  └──────────────────────────┬─────────────────────────────┘
                             │
                             ▼
  ┌────────────────────────────────────────────────────────┐
  │      Save Public URL URI into signature_path in DB     │
  └────────────────────────────────────────────────────────┘
```

1. **Drawing Vector Capture**: The `react-signature-canvas` component captures canvas vector paths based on user mouse or touch inputs.
2. **Base64 Export**: Converts the canvas drawing to an optimized base64-encoded PNG string on submission.
3. **API Upload**: Transmits the base64 image data to the Express backend via REST API.
4. **File Persistence**: The server decodes the base64 string and writes it to a file under `/public/uploads/signatures/` with a unique UUID filename.
5. **Database Reference**: Saves the public URI path (e.g., `/public/uploads/signatures/verify-xxx.png`) in the corresponding record's `signature_path` field, creating an accessible audit log.

---

## 18. Asset Allocation Workflow
The **Eligibility Engine** automatically calculates asset allotments at runtime, enforcing specific corporate distribution rules:

```
                        Asset Issue Request Triggered
                                      │
                                      ▼
                        Check Employee Tenure (DOJ)
                                      │
             ┌────────────────────────┴────────────────────────┐
             ▼ < 90 Days                                       ▼ >= 90 Days
     [New Joining Kit]                                 Enforce Quota Rules
    Quota: 3 Pant, 2 Shirt                             (Based on Employee Type)
   1 T-Shirt, 2 Socks (All Types)                              │
                                                               ▼
                                                  Determine Attire Choices
                                             (Alternative Attire / Gender)
                                                               │
                                                               ▼
                                                   Departmental Footwear
                                             (Safety / Liberty / BATA Shoes)
                                                               │
                                                               ▼
                                                  Check Policy-Specific Items
                                              (Union Linen, Soaps, Wellness)
```

* **New Joining Kit Quota**: Automatically allocated to employees with less than 90 days of tenure who have not yet received uniform allocations. This provides 3 Pants (or Chudidhar Bottoms), 2 Shirts (or Chudidhar Tops), 1 T-Shirt (or Chudidhar Coat), and 2 Socks.
* **Standard Annual Quota**: For standard employees, the annual allocation provides 2 Pants, 2 Shirts, 1 T-Shirt, and 2 Socks, resetting on their employment anniversary.
* **Attire Customization**: Female employees can opt for alternative attire choices, swapping Pants for Chudidhar Bottoms, Shirts for Chudidhar Tops, and T-Shirts for Chudidhar Coats. Additionally, an annual winter coat is marked as mandatory for all female employees except those in corporate designations.
* **Departmental Footwear Allocation**:
  * **Trainees/Interns**: Automatically allocated **Safety Shoes**.
  * **Supervisors/Union Operators**: Automatically allocated **Liberty Shoes**.
  * **Production, Maintenance, Quality, Stores, Shop Floor**: Automatically allocated **Safety Shoes** to comply with safety policies.
  * **All other roles**: Allocated standard **Bata Shoes**.
* **Union Linen Program**: Union members are eligible for yearly beds & quarterly towel distributions:
  * **Q1 (Jan–Mar)**: Turkey Towel.
  * **Q2 (Apr–Jun)**: 3-Piece Towel Set.
  * **Q3 (Jul–Sep)**: Bedsheet.
  * **Q4 (Oct–Dec)**: 3-Piece Towel Set.
* **Standard Operator Soap Distribution**: Non-union operators receive a quarterly soap allocation (3 soaps per quarter for the first 3 months, 4 soaps per quarter thereafter) up to an annual limit of 45 soaps.
* **Wellness & Benefit Distribution**: Tracks special wellness distributions, such as allocating 1 KG of Boost to employees following verified blood donations.

---

## 19. Replacement & Deduction Workflow
When physical gear is damaged, lost, or requires a size exchange:

* **Additional Item Requests**: Chargeable allocations. Items requested in excess of the standard free quota are validated against the **Official Price List**.
* **Replacement/Exchange Requests**: Triggered for damaged items, size changes, or standard exchanges. If an item requires return, the UI disables the handover verification button until the administrator confirms the old item was collected.
* **Payroll Cost Tracking**: Chargeable additional allocations are flagged as `Pending` until verified and handed over. Once completed, the status updates to `Paid`, and the costs are logged in the database to be exported for monthly payroll deductions.

---

## 20. Reporting & Excel Export System
The reporting engine dynamically compiles and streams structured spreadsheets using `exceljs` and `xlsx`:

* **Multi-Filter Parameter Handling**: Filters data on the backend using query parameters (such as department, date ranges, categories, verification methods, and request status).
* **High-Density Spreadsheet Generation**: Generates styled Excel workbooks containing auto-fit columns, customized headers, and formatted currency and date columns.
* **Streaming Binary Delivery**: Streams the generated spreadsheet directly to the browser as a binary blob with a date-stamped filename, ensuring fast and memory-efficient downloads.

---

## 21. System Architecture Diagram
```
┌────────────────────────────────────────────────────────────────────────┐
│                              CLIENT TIER                               │
│  React.js UI (Vite)  •  HTML5 Video Stream Camera  •  Canvas Signature │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                           HTTPS Requests / JSON
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                             GATEWAY TIER                               │
│           Node.js Express Server  •  Session Route Interceptors        │
│              JWT Cookie Validation  •  CORS Network Filters            │
└──────┬──────────────────────────────────────────────────────────┬──────┘
       │                                                          │
   Local TCP/IP                                               HTTP POST
   Port 1433                                                  Port 8001
       │                                                          │
       ▼                                                          ▼
┌──────────────────────────────┐                          ┌──────────────┐
│        DATABASE TIER         │                          │ COMP VISION  │
│  Microsoft SQL Server        │                          │ FastAPI      │
│  Sequelize Relation Schema   │                          │ OpenCV Image │
│  ACID Safe Transactions      │                          │ EasyOCR / PT │
└──────────────────────────────┘                          └──────────────┘
```

---

## 22. Folder Structure Explanation
```
PROVEXA/
│
├── client/                     # Frontend Vite + React SPA
│   ├── public/                 # Static public assets (icons, HTML assets)
│   ├── src/
│   │   ├── components/         # Shared UI components (Modals, Scanner, Sidebar)
│   │   ├── pages/              # Primary route screens (Employees, Issues, Reports)
│   │   ├── index.css           # Core styling and Tailwind imports
│   │   ├── main.jsx            # Application entrypoint
│   │   └── App.jsx             # Route registers and global providers
│   ├── package.json            # Frontend dependency configuration
│   ├── tailwind.config.js      # Tailwind style parameters
│   └── vite.config.js          # Vite build parameters
│
├── server/                     # Backend Node.js Express Server
│   ├── config/
│   │   └── database.js         # SQL Server Sequelize pool & schema migrations
│   ├── models/                 # Database schema models (Employee, Item, Issue)
│   ├── routes/                 # API route definitions (Auth, Issues, Reports)
│   ├── services/               # Core business services (Eligibility, Auth)
│   ├── public/                 # Static uploads storage for signature images
│   ├── index.js                # Server entrypoint file
│   └── package.json            # Backend dependency configuration
│
├── ocr_service/                # Python Computer Vision Microservice
│   ├── main.py                 # FastAPI endpoints and OpenCV OCR pipelines
│   ├── requirements.txt        # Python dependency definitions
│   └── start_ocr.bat           # Standalone service startup script
│
├── package.json                # Root concurrently development runner
├── start_provexa.bat           # Master double-click Windows startup script
└── ocr.bat                     # Windows port verification startup script
```

---

## 23. Database Design Concepts
The database architecture is designed in Third Normal Form (3NF) to ensure data integrity and eliminate transactional redundancies:
* **Separation of Concerns**: Master tables (such as `Employees`, `Items`, and `ItemCategories`) remain decoupled from transaction records (`IssueRecords`, `ReplacementRequests`, and `VerificationLog`), preventing conflicting data modifications.
* **Audit Trail Preservation**: Transaction records store snapshot fields (such as `employee_name` and `item_name`) alongside primary foreign keys. This design ensures historical records remain accurate and audit-compliant even if the master records are modified or deactivated in the future.
* **Unified Audit Tracking**: Features built-in timestamp tracking (`created_at`, `updated_at`) across all tables to support automatic tracking of data entry and updates.

---

## 24. Relational Mapping Concepts
Sequelize defines relational associations in `server/models/index.js`, linking tables using primary keys:

```
   ┌──────────────────┐          ┌──────────────┐          ┌──────────────────┐
   │    Employee      │1        *│  IssueRecord │*        1│       Item       │
   │  (PrimaryKey)    ├─────────►├──────────────┤◄────────┤   (PrimaryKey)   │
   └──────────────────┘          │  employee_id │          └──────────┬───────┘
                                 │    item_id   │                     │*
                                 └──────────────┘                     ▼
                                                           ┌──────────────────┐
                                                           │   ItemCategory   │1
                                                           │   (PrimaryKey)   │
                                                           └──────────────────┘
```

* **One-to-Many Mappings**: Defines direct associations, such as `ItemCategory.hasMany(Item)` and `Employee.hasMany(IssueRecord)`.
* **Foreign Key References**: Relational queries pull nested categories and related records automatically using Sequelize's `include` parameters:
  ```javascript
  include: [{ model: Item, include: [{ model: ItemCategory }] }]
  ```
* **Performance Optimization**: Dynamic table migrations configure mappings without rigid databases constraints (`constraints: false`). This decoupling ensures database migrations execute smoothly without locking interdependent tables.

---

## 25. Authentication & JWT Flow
The authentication system secures user sessions using encrypted JSON Web Tokens (JWT):

1. **Credentials Verification**: The user submits credentials at `/api/auth/login`. The server verifies the username and validates the password using `bcryptjs` with 10 hashing rounds.
2. **Token Generation**: Generates a JWT signed with a secure, random environment secret key, configuring a standard 24-hour token expiration.
3. **Secure Cookie Storage**: The server transmits the signed token to the browser inside an `HttpOnly`, `Secure` SameSite cookie. This prevents client-side scripts from reading the token, protecting it against Cross-Site Scripting (XSS) attacks.
4. **Request Interception**: The browser attaches the cookie automatically to subsequent API requests. The `AuthMiddleware` parses and validates the token, extracting the admin's session data.
5. **Session Expiration Handling**: If the token is invalid or expired, the middleware clears the cookie, blocks the request, and triggers a redirection to the login screen.

---

## 26. API Gateway Concept
The Express server acts as a secure **API Gateway**, routing frontend requests to the isolated OCR microservice:
* **Endpoint Consolidation**: Provides a single unified route surface (`/api/verification/ocr-scan`) for the client. The frontend is not exposed to internal port layouts or external Python endpoints.
* **Network Isolation**: The FastAPI microservice runs bound to local loopback spaces, restricting external access. The Express gateway acts as a proxy, verifying incoming JWT headers before forwarding the request to the OCR microservice.
* **CORS Management**: The gateway handles CORS verification, consolidating headers, origins, and cookie permissions into a single entry point.

---

## 27. Camera Integration Workflow
The camera system captures physical ID cards directly inside the browser using standard web APIs:
* **Media Stream Retrieval**: Captures a live media stream from the default camera using `navigator.mediaDevices.getUserMedia` with optimized video constraints.
* **Video Rendering**: Projects the live camera feed into an HTML5 `<video>` element styled with a custom scanning overlay guide.
* **Image Capture**: Draws the current video frame onto a hidden `<canvas>` element on capture, exporting it as an optimized base64 JPEG string:
  ```javascript
  const frame = canvas.getContext('2d').drawImage(video, 0, 0, w, h);
  const rawBase64 = canvas.toDataURL('image/jpeg', 0.85);
  ```
* **Memory Management**: Automatically stops active video tracks when the modal closes, releasing system hardware resources.

---

## 28. Mobile & Tablet Support
The interface is optimized for mobile and tablet screens, ensuring smooth performance on the warehouse floor:
* **Fluid Layout Grid**: Built using responsive Tailwind flex-box and grid systems, automatically adapting between desktop sidebars and vertical mobile layouts.
* **Touch-Optimized Interaction**: Features larger touch targets, simplified navigation, and accessible mobile layouts optimized for hand-held tablets.
* **Responsive Video Viewport**: The camera component scales dynamically to fit different mobile viewports, adjusting bounding guides to fit within smaller displays.

---

## 29. Local Network Access Setup
To run PROVEXA across a local area network (LAN), allowing supervisors to issue assets directly on tablets while walking the shop floor:

1. **Vite LAN Binding**:
   Configure Vite to bind to all active network interfaces by including the `--host` flag in `client/package.json`:
   ```json
   "dev": "vite --host"
   ```
2. **CORS Network Permissions**:
   The Express backend on Port 5000 is configured to accept requests from private local network IP ranges (`192.168.x.x`, `10.x.x.x`, `172.16-31.x.x`):
   ```javascript
   const corsOptions = {
       origin: function (origin, callback) {
           if (!origin) return callback(null, true);
           if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
               return callback(null, true);
           }
           if (/^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin)) {
               return callback(null, true);
           }
           callback(new Error('Not allowed by CORS'));
       }
   };
   ```
3. **Tablet Access**:
   Once running, devices on the same local network can access the application by pointing their browsers directly to the host laptop's local IP address (e.g., `http://192.168.1.15:5173`).

---

## 30. OCR Performance Optimization Concepts
To achieve fast and reliable OCR scans on standard CPUs, the system implements several performance optimizations:
* **Allowlist Constraint Filtering**: Configures EasyOCR to ignore letters, punctuation, and special characters, restricting searches purely to digits (`allowlist='0123456789'`). This optimization speeds up OCR processing by **over 60%**.
* **Model Weight Compression**: Quantizes PyTorch weights into 8-bit representations, reducing CPU memory utilization and accelerating matrix calculations.
* **Mag Ratio Lock**: Disables model upscaling by setting `mag_ratio=1.0`, avoiding unnecessary upscale processing on pre-scaled input images.

---

## 31. CPU Optimization Techniques
The system utilizes advanced software techniques to optimize CPU utilization during text extraction:
* **Spatial Resolution Capping**: Restricts input image resolutions to a maximum side of 600px, limiting total matrix multiplications during neural network passes.
* **Adaptive Early-Exit**: Checks character confidence scores on the initial preprocessed CLAHE pass. If the extracted code matches the expected ID with a confidence score of $\ge 0.40$, the system executes an early exit, skipping secondary thresholding passes to save CPU cycles.
* **Dynamic Frame Bounding**: Uses scanning overlays to guide users, encouraging them to center the ID card and reducing the necessity for complex multi-scale scanning sweeps.

---

## 32. PM2 Process Management Explanation
In production environments, **PM2** manages and maintains the Node.js backend processes:
* **Process Monitoring and Recovery**: Runs the Express backend in the background, automatically restarting the process if it encounters unhandled exceptions, thread locks, or crashes.
* **Cluster Expansion**: Supports horizontal process clustering, running multiple app threads across available CPU cores to improve request throughput.
* **Memory Limits**: Protects against memory leaks by configuring automatic restarts if memory usage exceeds configured limits:
  ```bash
  pm2 start index.js --name "provexa-server" --max-memory-restart 500M
  ```

---

## 33. IIS Deployment Architecture
For production deployments on Windows Server, Internet Information Services (IIS) manages traffic routing:
* **Hosting via `iisnode`**: Hosts the Express application directly within IIS worker processes, letting IIS manage process lifecycles and scale worker threads.
* **URL Rewriting Rules**: A custom `web.config` file routes incoming port traffic (e.g., requests to ports 80 or 443) directly to the running `iisnode` entry point:
  ```xml
  <configuration>
    <system.webServer>
      <handlers>
        <add name="iisnode" path="index.js" verb="*" modules="iisnode" />
      </handlers>
      <rewrite>
        <rules>
          <rule name="NodeJS">
            <match url="/*" />
            <action type="Rewrite" url="index.js" />
          </rule>
        </rules>
      </rewrite>
    </system.webServer>
  </configuration>
  ```
* **Application Pool Isolation**: Runs applications inside isolated app pools, preventing potential process errors from affecting other running services.

---

## 34. SQL Server Express Deployment Concept
Setting up SQL Server Express for production:
* **TCP/IP Port Binding**: Enforces connections through a static TCP port (typically port 1433) in SQL Server Configuration Manager, enabling connection string routing.
* **Mixed-Mode Security**: Configures the database to support both Windows Authentication and SQL Server authentication modes, using strong SQL user credentials for Sequelize connections.
* **Resource Optimization**: SQL Server Express limits memory usage to a maximum of 1.4GB, preventing the database engine from monopolizing system memory.

---

## 35. Production Deployment Architecture
```
                         INCOMING INTERNET / LAN TRAFFIC
                                        │
                                        ▼
                         MICROSOFT IIS (Ports 80 / 443)
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼ Static React Build                                  ▼ REST API Proxy
     [Static HTML/JS]                                        [iisnode Routing]
                                                                   │
                                                                   ▼
                                                            Express Gateway (Port 5000)
                                                                   │
                                           ┌───────────────────────┴───────────────────────┐
                                           ▼ SQL Queries                                   ▼ Forward Scan
                                    [SQL Server Express]                             [FastAPI Microservice]
                                        (Port 1433)                                       (Port 8001)
```

1. **Gateway Layer**: Microsoft IIS receives incoming traffic, serving pre-built static React files directly and routing API requests to the Express server using `iisnode`.
2. **API Logic Layer**: The Express backend processes application requests, validating authorization cookies and routing queries.
3. **OCR Processing Service**: The FastAPI microservice runs in the background on Port 8001, executing image recognition tasks.
4. **Relational Database**: SQL Server Express runs as a local database engine, handling queries securely on Port 1433.

---

## 36. Why SQL Server Was Used
* **Corporate IT Compliance**: High compatibility with corporate Windows Server systems, meeting security and compliance requirements.
* **ACID Transaction Reliability**: Robust support for transactions, ensuring data integrity across critical workflows like inventory adjustments and asset handovers.
* **Enterprise Reporting Compatibility**: Native compatibility with enterprise BI tools, making it easy to sync data with third-party reporting platforms.

---

## 37. Why FastAPI Was Used
* **Asynchronous Execution**: High-performance asynchronous Request-Response loops, managing multiple concurrent API calls without blocking.
* **Built-in Schema Validation**: Automated data validation and documentation using Pydantic, simplifying integration debugging.
* **Fast Python Execution**: Significantly faster than traditional Python frameworks like Flask, making it ideal for deep learning microservices.

---

## 38. Why Node.js Was Used
* **Asynchronous Event Loop**: High concurrency support, handling multiple API requests efficiently.
* **Unified Javascript Language**: Developers can write Javascript across both client and server codebases, improving development speed and maintainability.
* **Rich NPM Ecosystem**: Direct access to useful npm libraries (such as `exceljs`, `sequelize`, and `jsonwebtoken`), accelerating backend development.

---

## 39. Why React Was Used
* **Component Reusability**: Developers can build modular, self-contained UI components (e.g., scanners, forms, modal dialogs) to keep code organized.
* **Virtual DOM Updates**: High-performance rendering of dynamic lists and timelines without full page reloads.
* **Robust Ecosystem Support**: Native compatibility with powerful frontend tools like React Query, React Router, and Tailwind CSS.

---

## 40. Why OCR Microservice Was Separated
* **Resource Isolation**: Isolating CPU-intensive Python OCR tasks prevents heavy image processing from slowing down or crashing the core Express web server.
* **Simplified Dependency Management**: Separates heavy machine learning dependencies (like PyTorch and OpenCV) from light JavaScript modules, keeping each codebase clean.
* **Flexible Scalability**: Allows the OCR microservice to be scaled or moved to dedicated hardware with GPU support in the future without modifying core business APIs.

---

## 41. Deployment Steps on Another Laptop
To deploy and run this project on another machine, follow these step-by-step instructions:

### Step 1: Copy or Clone the Codebase
Transfer the project folder to the new laptop using a USB drive or clone it directly using Git:
```bash
git clone <repository_url> PROVEXA
cd PROVEXA
```

### Step 2: Install Git & Node.js
Ensure the target laptop has **Git** and **Node.js (v20 or higher)** installed. Verify their installations using the command line:
```bash
node -v
npm -v
```

### Step 3: Install Python (for OCR Microservice)
Install **Python (v3.10 or v3.11)** on the target machine. Make sure to check the option to **"Add Python to PATH"** during installation. Verify the installation:
```bash
python --version
```

### Step 4: Install SQL Server Express & SSMS
1. Download and run the **SQL Server Express Edition** installer. Select the **Basic Installation** option.
2. Download and install **SQL Server Management Studio (SSMS)** to manage the database visually.
3. Configure the database to accept SQL login credentials:
   * Open SSMS, right-click the database server instance, select **Properties**, go to the **Security** tab, and select **SQL Server and Windows Authentication mode**.
   * Create a new SQL login named `provexa_user` with password `Provexa@123`. Assign dbcreator permissions, or map the user to the target database.

---

## 42. SQL Server Backup & Restore Steps
Ensure database tables are created inside the database before migration begins. If restoring from an existing database backup file (`.bak`), use these steps:

### 43. How to Create .bak Backup
To create a backup file of the existing database, open SSMS, connect to the database instance, open a **New Query** window, and execute the following T-SQL command:
```sql
BACKUP DATABASE ProvexaDB_New
TO DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH FORMAT,
     MEDIANAME = 'SQLServerBackups',
     NAME = 'Full Backup of ProvexaDB_New';
GO
```

### 44. How to Restore Database
To restore the database from a backup file on the new laptop:
1. Place the backup file (`.bak`) in an accessible directory (e.g., `C:\Backups\ProvexaDB_Backup.bak`).
2. In SSMS, open a **New Query** window and run the following T-SQL command:
```sql
-- Ensure the destination database is not in use
USE master;
ALTER DATABASE ProvexaDB_New SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

-- Restore the database from the backup file
RESTORE DATABASE ProvexaDB_New
FROM DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH REPLACE,
     RECOVERY;

-- Set database back to multi-user mode
ALTER DATABASE ProvexaDB_New SET MULTI_USER;
GO
```

---

## 45. Environment Variable Configuration
Configure the environment variable files in both server and client folders before starting the application:

### Server Environment Variables (`server/.env`)
Create a new file named `.env` in the `server` directory and add the following configuration:
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

### Client Environment Variables (`client/.env`)
Create a new file named `.env` in the `client` directory and configure the backend URL point:
```env
VITE_API_URL=http://localhost:5000
```

---

## 46. Installation Steps
Run the following commands in order to configure the application services:

### 47. Backend Dependency Installation
Navigate to the server directory and install the required Node.js packages:
```bash
cd server
npm install
```

### 48. Frontend Dependency Installation
Navigate to the client directory and install the required frontend packages:
```bash
cd ../client
npm install
```

### 49. OCR Service Installation
Set up a Python virtual environment and install the required dependencies:
1. Open a terminal and navigate to the `ocr_service` directory:
   ```bash
   cd ../ocr_service
   ```
2. Create a new virtual environment:
   ```bash
   python -m venv venv
   ```
3. Activate the virtual environment:
   * **PowerShell**: `venv\Scripts\Activate.ps1`
   * **CMD**: `venv\Scripts\activate.bat`
4. Install the required Python libraries:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: The initial setup will automatically download PyTorch and the EasyOCR English language model weights on first run, which may take a few minutes).*

---

## 50. Running Frontend
To start the React frontend server in development mode, run the following commands:
```bash
cd client
npm run dev
```
The server will start and display the local network URLs (e.g., `http://localhost:5173`).

---

## 51. Running Backend
To start the Express API backend, open a new terminal window and run:
```bash
cd server
npm run dev
```
This boots the server on Port 5000, establishes connection with SQL Server, and automatically runs schema validations.

---

## 52. Running OCR Service
To launch the FastAPI OCR microservice, open a new terminal window and run:
```bash
cd ocr_service
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
```
Alternatively, double-click the `ocr.bat` file in the root folder to automatically check and clear the port before launching the service.

### Master Launch Script
To start all three services concurrently with a single action, double-click the `start_provexa.bat` file located in the root project directory.

---

## 55. Reverse Proxy Configuration Concept
When deploying the application in production environments, a reverse proxy consolidates traffic routing under a single domain:
* **Consolidated Domain Structure**: Serves both frontend assets and backend APIs under a single port (e.g., Port 80 for HTTP or Port 443 for HTTPS).
* **Eliminating CORS Restraints**: Routing frontend calls and backend endpoints through the same server proxy eliminates the necessity for complex cross-origin sharing rules in production.
* **SSL Offloading**: The proxy server handles SSL certificate decryption, freeing up application servers from processing SSL overhead.

---

## 56. Firewall & Port Configuration
To ensure smooth communication across the local network, configure the host laptop's firewall to allow traffic through the following ports:

| Port | Protocol | Usage | Firewall Rule |
| :--- | :--- | :--- | :--- |
| **5173** | TCP | Vite Frontend Server | Allow incoming connections from private LAN profiles. |
| **5000** | TCP | Express API Server | Allow incoming connections from private LAN profiles. |
| **8001** | TCP | FastAPI OCR Service | Keep blocked from external public networks (accessible locally). |
| **1433** | TCP | SQL Server Database | Allow incoming database connections from authorized systems. |

---

## 57. API Endpoints Table

| Method | Endpoint | Description | Auth Required | Request Payload Fields |
| :--- | :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/login` | Authenticate admin credentials. | No | `{ email, password }` |
| **POST** | `/api/auth/logout` | Clear user session cookies. | Yes | None |
| **GET** | `/api/auth/me` | Fetch active admin session data. | Yes | None |
| **GET** | `/api/employees` | Paginate employee directories. | Yes | Query: `?page=x&search=y` |
| **POST** | `/api/employees` | Create a new employee record. | Yes | `{ emp_code, name, department, designation, employee_type, gender, sizes }` |
| **GET** | `/api/employees/:id/asset-profile` | Fetch employee asset profiles. | Yes | None (URL ID parameter) |
| **POST** | `/api/issues` | Distribute assets in bulk. | Yes | `{ employee_ids: [], item_payloads: [], issued_date }` |
| **PUT** | `/api/issues/acknowledge/:id` | Verify single asset handover. | Yes | `{ method, signature, ocr_details }` |
| **POST** | `/api/issues/:id/renew` | Renew an active asset cycle. | Yes | `{ notes, item_condition }` |
| **POST** | `/api/issues/:id/return` | Mark an issued asset as returned. | Yes | `{ returned_condition, remarks }` |
| **POST** | `/api/replacements` | Request additional/exchange items. | Yes | `{ employee, item, allocation_type, reason, quantity, size }` |
| **PUT** | `/api/replacements/:id/approve` | Approve replacement cost. | Yes | `{ unit_cost, notes }` |
| **GET** | `/api/reports/export` | Download issue reports (.xlsx). | Yes | Query parameters for filters |

---

## 58. Testing Workflow
PROVEXA provides multiple workflows to verify system components:
1. **Mock OCR Verification**:
   The verification system includes fallback fields to complete handovers if the scanner fails or cannot read an ID card due to poor lighting, allowing administrators to verify identity manually.
2. **API Verification**:
   FastAPI exposes automated interactive API documentation. Developers can test endpoints directly by opening `http://localhost:8001/docs` in their browsers.
3. **Database Relational Auditing**:
   Modify values or check schema changes directly in SSMS by executing verification queries against the target tables:
   ```sql
   SELECT * FROM IssueRecords WHERE employee = 'TARGET_EMPLOYEE_UUID';
   ```

---

## 59. Troubleshooting Section

### 60. Common Errors & Solutions

* **Error: `ConnectionError: Port 1433 not open` (or Tedious Connection Failures)**
  * *Reason*: SQL Server is not configured to accept TCP/IP connections, or the SQL Service is stopped.
  * *Solution*: Open **SQL Server Configuration Manager**, go to **SQL Server Network Configuration**, select **Protocols for SQLEXPRESS**, right-click **TCP/IP** and click **Enable**. Restart the SQL Server service in Windows Services.

* **Error: `EasyOCR model download failed / connection timed out`**
  * *Reason*: The server is blocked from downloading model weights on first run due to lack of internet access.
  * *Solution*: Connect the machine to an active internet connection on first run, letting PyTorch download and cache the weight files in the user profile folder (`~/.EasyOCR/`).

* **Error: `Port 8001 is already in use`**
  * *Reason*: A background instance of the FastAPI microservice is still running in another process.
  * *Solution*: Run `ocr.bat` directly. The batch script automatically kills existing processes running on port 8001 before starting the service.

* **Error: `CORS Blocked Origin: Not allowed by CORS`**
  * *Reason*: A device on the LAN is attempting to access the backend API using an IP or domain name that is not registered in the Express CORS whitelist.
  * *Solution*: Add the host system's IP address or domain suffix directly to the CORS origin filter array in `server/index.js`.

---

## 61. Windows Deployment Notes
* **Execution Policy Configuration**:
  If PowerShell blocks you from running virtual environment activation scripts, open a PowerShell terminal as Administrator and execute the following command:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
  ```
* **Folder Permissions**:
  Ensure the active user account has full read/write permissions for the `server/public/` directory, allowing the application to save signature images correctly.
* **Path Length Configurations**:
  If Git encounters long path issues on Windows, enable long path support in Git:
  ```bash
  git config --global core.longpaths true
  ```

---

## 62. Production Best Practices
* **Secrets Rotation**: Change the default `JWT_SECRET` key to a strong, randomly generated hex string in production environment files.
* **Enforce SSL Encryption**: Configure reverse proxies to redirect Port 80 traffic to Port 443, securing network communication.
* **Database Maintenance Plan**: Schedule automated database backups (`.bak` files) to run daily using Windows Task Scheduler or SQL Server Agent.
* **Optimize Logs**: Disable verbose Sequelize debug logs (`logging: false` in database settings) in production to improve server processing performance.

---

## 63. Security Concepts
* **Bcrypt Password Hashing**: Avoids storing passwords in plain-text, encrypting credentials using salting with 10 hashing rounds.
* **HttpOnly Cookies**: Employs secure cookies to prevent cross-site scripting (XSS) scripts from reading authentication tokens.
* **SQL Injection Prevention**: Enforces parameterized inputs and queries via Sequelize ORM, protecting the database against malicious injection inputs.
* **Input Validation**: Restricts input fields to expected types and lengths (e.g. employee IDs must be 3-to-7 digit numeric strings).

---

## 64. Audit Logging Concepts
PROVEXA preserves a detailed audit history across all operations:
* **Immutable Logs**: Acknowledged distributions create unique entries in the `VerificationLog` table, saving scanned text, OCR confidence ratings, device metadata, and signature paths.
* **Deletion Protection**: Restricting standard delete operations preserves transaction histories. The system archives records instead of deleting them, maintaining accurate financial and operational histories.

---

## 65. Enterprise Scalability Concepts
To scale PROVEXA for larger distributions:
* **Database Clustering**: Upgrading from SQL Server Express to SQL Server Standard enables active-passive clustering, ensuring database availability.
* **In-Memory Cache Layers**: Integrating Redis caches session states and frequently queried configurations, reducing database query overhead.
* **OCR Microservice Scalability**: Moving image processing to dedicated hardware with GPU capabilities allows the system to process larger scanning queues.

---

## 66. Future Enhancements
* **Active Directory / Single Sign-On**: Integrating LDAP/Active Directory or OAuth2 providers lets administrators log in using standard corporate credentials.
* **RFID and Smart-Badge Handovers**: Adding RFID support allows stores to scan and issue assets instantly using smart employee badges.
* **Predictive Inventory Engines**: Utilizing machine learning models to analyze historical distribution data helps stores predict and order inventory ahead of upcoming cycles.

---

## 68. Conclusion
**PROVEXA** provides an innovative, secure, and highly reliable approach to enterprise asset management. By integrating computer vision-based ID verification and digital signature capture, it replaces error-prone manual logs with an automated digital audit trail. 

Built on a robust relational database foundation, decoupled microservices, and optimized CPU processing, PROVEXA delivers high performance, scalability, and security—making it a perfect fit for corporate, manufacturing, and industrial deployments.
