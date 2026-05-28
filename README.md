# PROVEXA — Enterprise Asset Management & OCR Handover Verification System
### Complete Technical Documentation & Deployment Handbook

---

## 1. Project Overview

### What?
**PROVEXA** is an industrial-grade, zero-trust Asset Management and Handover Verification System. It automates, tracks, and verifies the lifecycle of critical corporate and physical assets—specifically uniforms, safety equipment (PPE), linen, and operator welfare benefits—assigned to industrial and corporate workforces.

### Why?
Large industrial organizations, factories, assembly plants, and logistics hubs suffer from substantial asset losses (shrinkage) and high procurement costs. Paper registers, spreadsheets, and manual honor-system logs lack accountability, make lifecycle tracking impossible, and create friction when operators claim they never received their designated gear. PROVEXA was developed to replace these manual bottlenecks with a completely digitized, legally binding, and audit-ready digital trail.

### How?
The system utilizes:
1. **Computer Vision & Neural Network OCR**: Instantly reads physical employee badge ID cards at the distribution desk using standard camera streams.
2. **HTML5 Canvas Signatures**: Captures electronic signatures in real time, saving them directly as compressed image files linked to transaction records.
3. **Dynamic Policy & Quota Engine**: Evaluates employee metrics (tenure, gender, role, department, union membership) to enforce company policies, compute valid quotas, map replacement requests, and calculate payroll deductions.

### Where?
PROVEXA is deployed as an intranet system within the organization's local area network (LAN). It runs on standard computers and tablets, connecting securely over local Wi-Fi without needing an internet connection.

### Advantages:
* **Zero Asset Shrinkage**: Multi-layered identity checks prevent duplicate issues and gear hoarding.
* **Intranet Portability**: Runs entirely offline on a local router, making it ideal for physical shop floors.
* **Policy Compliance**: Eliminates manual auditing by automatically applying complex company-policy rules during distribution.

### Real Implementation inside PROVEXA:
In the PROVEXA codebase, when a store manager inputs an issue request, the core services process the request through a dedicated policy verification model. The frontend UI captures the badge scan, decodes the digits, compares them against the target employee's recorded `emp_code`, and registers the transaction only after a matching ID confirmation.

---

## 2. Executive Summary

PROVEXA delivers high-level business value by replacing manual administrative processes with automated control workflows. 

### High-Level Business Value
Physical asset inventory represents a major financial footprint. By implementing a digitized zero-trust system, organizations reduce asset losses, coordinate procurement schedules, and eliminate administrative labor overheads.

### Main Workflows
The system operates on three primary workflows:
1. **Asset Issue**: Supervisors select employees and target items, automatically screening allocations against company quotas.
2. **Handover Verification**: The system verifies the employee's identity via a live ID card scan (OCR text matching) and captures an electronic signature before committing the transaction.
3. **Lifecycle Management**: Tracks active holdings, handles replacement requests, coordinates exchanges, and manages returns.

```
  Supervisor Issue Request ──► Quota Check ──► ID Card Scan ──► Signature ──► Database Commit
```

### OCR Verification Purpose
Physical identity cards serve as proof of presence. Using digital character recognition prevents supervisors from shortcutting verification steps, ensuring the employee was physically present at the distribution desk.

### Digital Asset Accountability
Every asset movement generates a digital audit record. The system links captured signatures, scanned ID text, confidence scores, transaction dates, and supervisor metadata to the issue record, creating an immutable history for health, safety, and environment (HSE) compliance audits.

---

## 3. Business Problem Statement

Traditional asset distribution in heavy industries, manufacturing plants, and warehousing facilities faces severe operational bottlenecks:
* **Paper-Based Acknowledgements**: Storekeepers rely on physical ledgers or Excel lists. These records are frequently lost, difficult to search, and impossible to compile for monthly audits.
* **Manual Quota and Policy Oversight**: Guidelines vary dynamically—Union operators receive quarterly towel distributions, Trainees receive safety shoes instead of corporate boots, and female operators choose alternative Chudidhar packages. Manually checking these policies across thousands of workers is slow and highly prone to error.
* **Lack of Accountability and Signature Fraud**: Without physical proof of presence, storekeepers may distribute gear to third parties or enter incorrect names, leading to expensive double-issuances when workers claim they never received their items.
* **Complex Replacement Tracking**: Managing replacement requests for damaged or lost gear, checking old-asset returns, and coordinating with HR for payroll cost deductions is disjointed and prone to financial leakage.

---

## 4. Solution Overview

PROVEXA resolves these corporate bottlenecks through a comprehensive digital ecosystem:

* **Asset Lifecycle Automation**: Enforces structured lifecycle states (`Pending Acknowledgement`, `Active`, `Returned`, `Renewed`, `Archived`) for all issued assets, calculating future renewal dates automatically based on item validity rules.
* **AI-Powered Handover Verification**: Integrates a custom high-performance OCR service that reads physical employee badges in milliseconds, verifying character structures against relational database files before committing any transactions.
* **Digital Signatures**: Captures electronic signatures in real time, saving them directly as compressed image files linked to transaction records.
* **Reporting Automation**: Replaces manual spreadsheets with a high-performance export engine, generating detailed, styled Excel reports matching the organization's corporate structure.
* **Immutable Auditing**: Logs all verification and issue events inside a dedicated table, compiling signed handover proof sheets for regulatory compliance audits.

---

## 5. Key Features

* **Employee Quota & Eligibility Engine**: Automatically computes allowances based on tenure (such as first-90-day Joining Kits) and designation (such as specialized safety gear).
* **Unified Dual-Mode Verification**: Enforces secure handover via AI-driven ID Card scan, digital signature, or a strict dual-mode (OCR + Signature) requirement.
* **Dynamic Replacement & Exchange Centers**: Tracks asset exchanges for size adjustments or damages, enforcing old-asset returns prior to new handovers.
* **Integrated Payroll Cost Tracking**: Matches chargeable assets against price lists, logging employee-signed deductions for simple HR export.
* **Automated Renewal & Return Centers**: Automatically computes future renewal deadlines and logs the condition of returned assets (Good, Damaged, Salvaged).
* **Intranet Local Network Portability**: Enables the system to run on a local Wi-Fi router, allowing supervisors to issue assets directly on tablets while walking the shop floor.
* **Styled Excel Reports**: Streams formatted, filtered spreadsheets directly to administrators for rapid business reports.
* **Role-Based Access Control**: Restricts administrative controls using JSON Web Tokens (JWT) stored in secure, `HttpOnly` cookie layers.

---

## 6. System Modules

### I. Authentication Module
* **Purpose**: Secures administrative access, ensuring only authorized supervisors can manage directories, issues, and replacements.
* **Workflow**: Admins enter credentials, the server validates the password using `bcryptjs` with 10 hashing rounds, generates a 24-hour JSON Web Token (JWT), and saves it inside an `HttpOnly` browser cookie.
* **Business Value**: Protects sensitive employee and financial deduction records from unauthorized access.
* **Backend Interaction**: Intercepts requests to restricted endpoints using `AuthMiddleware`, validating session tokens before executing controller logic.

### II. Employees Module
* **Purpose**: Manages active rosters, designations, and sizing profiles (Shirt, Pant, Shoe).
* **Workflow**: Admins search the directory, edit employee parameters, input sizing profiles, and review asset profiles displaying current active holdings, quotas, and timeline logs.
* **Business Value**: Standardizes sizes and employee types, providing the baseline parameters for quota calculations.
* **Backend Interaction**: Queries the database using Sequelize models, running filters for search inputs, departments, and paginated records.

### III. Asset Categories & Items Module
* **Purpose**: Manages the company asset catalog and distribution schedules.
* **Workflow**: Admins group items under custom categories (such as Uniforms, Linen, Welfare, or Safety Gear), configuring validity rules using custom validity days or fixed calendar dates.
* **Business Value**: Centralizes inventory parameters and automates renewal scheduling.
* **Backend Interaction**: Updates database records, running check procedures to prevent duplicate item names and categories.

### IV. Asset Issues Module
* **Purpose**: Processes new asset distributions and manages handovers.
* **Workflow**: Supervisors select employees and target items, verify dynamic quota allowances, trigger the camera scanner, collect signatures, and submit the transaction.
* **Business Value**: Prevents duplicate issues and enforces zero-trust physical verification checks.
* **Backend Interaction**: Inserts new records inside the `IssueRecords` table, generating transaction IDs and calculating `next_due_date` parameters based on item schedules.

### V. OCR Verification Module
* **Purpose**: Reads physical employee badges in real time to verify identity.
* **Workflow**: The frontend captures a camera frame, encodes it as a base64 string, and POSTs it to the Express API. Express forwards it to the Python FastAPI microservice, which executes OpenCV contrast filters, processes the frame through EasyOCR, and returns the decoded ID.
* **Business Value**: Confirms the physical presence of the employee, preventing signature fraud.
* **Backend Interaction**: Proxies image payloads to FastAPI via REST requests, executing SQL validations if the OCR result matches the target employee code.

### VI. Replacement Management Module
* **Purpose**: Coordinates asset replacements, exchanges, and financial recovery.
* **Workflow**: Admins submit replacement requests for damaged or lost items. Chargeable assets are validated against the official price list. Supervisors verify that the old asset was collected before handovers can be completed.
* **Business Value**: Restricts inventory losses and automates financial recovery logs.
* **Backend Interaction**: Inserts records inside the `ReplacementRequests` table, tracking old-item returns and updating billing parameters.

### VII. Reporting Module
* **Purpose**: Generates high-density Excel reports for business tracking.
* **Workflow**: Admins apply filters (such as date ranges, departments, or categories) and click the export action. The backend queries records, compiles a styled Excel sheet using `exceljs`, and streams it as a binary download.
* **Business Value**: Automates monthly auditing and streamlines payroll coordination.
* **Backend Interaction**: Aggregates filtered relational tables, converting database records into styled spreadsheet layouts.

---

## 7. Technology Stack

| Technology | Purpose | Why Chosen | Where Used |
| :--- | :--- | :--- | :--- |
| **React.js** | Frontend UI Framework | Component-based, responsive SPA execution, Virtual DOM speed. | Core client directory (`client/src/`). |
| **Vite** | Frontend Development & Build Tool | Fast hot module replacement, optimized compilation, modern asset delivery. | Client root (`client/vite.config.js`). |
| **Tailwind CSS** | Styling Utility Framework | Responsive grid systems, styled dark/light cards, mobile optimization. | Core client design (`client/src/index.css`).|
| **Node.js** | Core Server Runtime | Lightweight, event-driven, processes massive concurrent tasks easily. | Core server process (`server/index.js`). |
| **Express.js** | API Routing Framework | Simple routing controllers, flexible middleware pipelines, fast parsing. | Server routing routes (`server/routes/`). |
| **SQL Server Express**| Relational Database Engine | High-performance relational queries, ACID transaction safety, corporate compatibility. | Local host database installation. |
| **Sequelize ORM** | Object-Relational Mapper | Parameterized query security, structured database model relationships, auto-migrations. | Server database mapping (`server/models/`). |
| **FastAPI** | Python Web Framework | High-speed asynchronous Python execution, native validation, clean API parsing. | OCR service root (`ocr_service/main.py`). |
| **OpenCV** | Computer Vision Library | Advanced pixel preprocessing, contrast filters, crop boundaries, binarization. | OCR service image filters (`ocr_service/main.py`).|
| **EasyOCR** | Text Extraction Engine | High-accuracy character recognition on styled text without heavy training dependencies. | Python OCR execution (`ocr_service/main.py`).|
| **PyTorch** | Machine Learning Core | Fast matrix calculations and neural network tensor processing on CPUs. | Python dependency core within virtualenv. |
| **PM2** | Process Manager | background execution, automatic restarts on exception crashes. | Production server deployment daemon. |
| **IIS** | Production Web Gateway | High-speed static web hosting, secure reverse proxying, SSL certificate handling. | Windows Server production layout. |
| **JWT** | User Session Security | Stateless session token checks, secure encrypted signatures. | Server authorization checks (`server/routes/auth.js`).|
| **Multer** | Multi-Part File Handling | Processes incoming form-data fields and file uploads. | Backend file parsers (`server/routes/`). |
| **ExcelJS** | Spreadsheet Compilation Engine| Programmatic workbook construction, cell formatting, column styling. | Server reporting service (`server/routes/reports.js`).|

---

## 8. Frontend Architecture

### What?
The frontend is a single-page web application (SPA) designed to act as the primary administration console and distribution desk.

### Why?
We used a Single Page Application (SPA) architecture rather than traditional multi-page HTML websites because SPAs load the entire web package once. Subsequent navigation occurs instantly without page refreshes, providing a smooth, application-like user experience that prevents delays in busy warehouse environments.

### How?
Vite is used to compile, bundle, and serve our React components:
* **Vite Web Server**: Serves compiled JavaScript and Tailwind styles to client browsers on Port 5173.
* **Nested Routing Layouts**: Managed by `react-router-dom`, displaying unified headers, sidebars, and alerts.
* **TanStack Server State Caching**: Eliminates redundant API calls. Action triggers automatically invalidate corresponding keys, keeping metrics and data tables updated instantly.
* **Tailwind CSS Grid Systems**: Restructures screen layouts dynamically across desktops, laptops, and tablets.

### Where?
All frontend source code resides inside the `client/` directory, managed via `client/package.json`.

### Advantages:
* **No Sluggish Page Refreshes**: Dynamic DOM updates keep distribution counters and scanner states active.
* **Hot Module Replacement**: Vite updates individual components in milliseconds during development, accelerating code adjustments.
* **Fluid Grids**: Enforces clean styling configurations tailored for touch inputs.

### Real Implementation inside PROVEXA:
In `client/src/App.jsx`, the system configures a nested React Query provider that wraps all routes. The `EmployeeAssetProfile` screen fetches employee profiles using an active hook. When an issue transaction completes, the hook triggers an automatic invalidation, updating the profile indicators immediately without full page reloads.

---

## 9. Backend Architecture

### What?
The backend is a Node.js Express server that acts as the primary API Gateway, managing business logic, routing transactions, and coordinating database and OCR processes.

### Why?
Node.js was chosen because of its asynchronous, single-threaded, non-blocking I/O model. In web applications that frequently interact with databases and external services, traditional servers assign a dedicated system thread to every single connection. When thousands of connections compete, server memory and threads lock up. Node.js processes thousands of concurrent HTTP requests on a single event-driven loop, delegating slow database queries and file writes to the operating system's background workers.

### How?
Express.js acts as our web application framework:
* **Routing Controllers**: Match incoming URLs (e.g. `GET /api/issues`) and execute clean Javascript functions.
* **Middleware Interceptors**: Process incoming payloads, validate session JWT cookies, parse multi-part payloads using Multer, and check CORS parameters before passing the request to core services.
* **REST API Interfaces**: Standardize JSON responses, ensuring secure, predictable communication with the frontend.

### Where?
All server-side logic resides inside the `server/` directory, booting via `server/index.js` on Port 5000.

### Advantages:
* **Unified Codebase Language**: Enables developers to write Javascript across both client and server layers.
* **Asynchronous Scalability**: Coordinates file writes, database connections, and reporting downloads easily.
* **Clean Routing Structure**: Simplifies endpoint management and request validations.

### Real Implementation inside PROVEXA:
In `server/index.js`, the Express app mounts security whitelists, registers cookie parsers, and secures backend directories using middleware. When requests reach route entries like `/api/issues`, the backend runs `AuthMiddleware` to parse cookie headers, extracts active admin IDs, and checks authorizations before returning database records.

---

## 10. Database Architecture

### What?
The database is a local Microsoft SQL Server Express installation managed using the Sequelize Object-Relational Mapper (ORM).

### Why SQL Server over PostgreSQL or MongoDB?
PROVEXA handles highly structured, transaction-dependent data. An asset issue record must link to a valid employee and an active item catalog index. 
* **MongoDB (NoSQL)**: Uses unstructured JSON-like documents. It does not natively enforce relational relationships, which can lead to data conflicts where transactions reference missing records.
* **PostgreSQL**: An excellent relational database, but SQL Server is chosen because of its native integration with Windows platforms and robust performance inside local enterprise subnets.
* **ACID Transactions**: Enforces strict database transaction controls. Renewals and returns use Sequelize transactions to guarantee database rollback if any query fails, preventing partial, corrupted entries.

### How?
Sequelize acts as our Object-Relational Mapper (ORM):
* **Model Class Definitions**: Maps database tables (such as `Employee` or `IssueRecord`) directly to JavaScript classes.
* **Parameterized Query Security**: Sequelize automatically sanitizes all inputs, preventing SQL injection hacking attacks.
* **Structural Join Declarations**: Coordinates table relationships (e.g. `Employee.hasMany(IssueRecord)`) without writing complex, manual SQL queries.

### Where?
Configured inside `server/config/database.js` and defined across models in `server/models/`.

### Advantages:
* **Prevents SQL Injection**: Protects against database queries hacking attacks.
* **Automatic Migrations**: Simplifies structural schema updates on new laptop deployments.
* **Loose Constraint Integration**: Configuring relationships dynamically without rigid database locks ensures migrations execute cleanly.

### Real Implementation inside PROVEXA:
The database configuration service (`server/config/database.js`) connects to SQL Server via the standard `tedious` driver. It verifies connection state, alters tables to verify new columns (such as `grade`, `is_union_member`, or `is_alternative_attire`), and runs startup data migration checks.

---

## 11. OCR Microservice Architecture

### What?
The OCR service is a decoupled Python **FastAPI** web service running OpenCV and EasyOCR to process badge scans.

### Why?
Computer vision and machine learning libraries (such as OpenCV, PyTorch, and EasyOCR) are written and optimized in Python. Running these CPU-heavy neural network calculations inside the single-threaded Node.js backend would spike the event loop, freezing all other user requests and transactions. Isolating these calculations into a separate Python service ensures high performance and decouples heavy ML dependencies.

### How?
FastAPI manages communication with the core server:
* **REST Request Proxies**: Node.js forwards captured base64 images via standard POST requests (`/scan`).
* **Model Pre-Warming**: FastAPI loads EasyOCR character weights into memory exactly **once at startup**. Subsequent scans utilize the preloaded model in memory, reducing request latency.
* **Fast Asynchronous Execution**: Built on Starlette and Pydantic, FastAPI executes non-blocking machine learning routes, validating inputs and returning clean JSON payloads.

### Where?
All computer vision logic resides inside `ocr_service/main.py`, running on Port 8001.

### Advantages:
* **CPU Load Containment**: Spikes in OCR request loads do not slow down database transactions.
* **Clean Code Decoupling**: Separates machine learning modules from lightweight business routers.
* **Fast Matrix Calculations**: Quantization compresses neural weights into 8-bit representations, accelerating CPU execution.

### Real Implementation inside PROVEXA:
In `ocr_service/main.py`, the system configures an EasyOCR reader instance at startup. The `/scan` endpoint decodes base64 JPEG strings into OpenCV image arrays, executes contrast filters, performs neural network text recognition, and returns the results.

---

## 12. OCR Verification Workflow

When an operator scans their badge, PROVEXA coordinates a fast, 10-step computer vision pipeline:

```
┌───────────┐      1. POST image frame (base64)      ┌───────────┐
│  React    ├───────────────────────────────────────►│  Express  │
│  Client   │◄───────────────────────────────────────┤  Backend  │
└───────────┘       10. Return JSON validation       └─────┬─────┘
                                                           │
                                2. Proxies base64 Image    │ 9. Commit
                                                           ▼
┌───────────┐               3. Decodes ID            ┌───────────┐
│  FastAPI  │◄───────────────────────────────────────┤ SQL Server│
│    OCR    ├───────────────────────────────────────►│ Database  │
└───────────┘            4. Returns "11333"          └───────────┘
```

1. **Camera Frame Capture**: The supervisor opens the camera viewport overlay inside the React client. When captured, React draws the current video frame on a hidden canvas, exporting it as an optimized base64 JPEG string.
2. **Express API Forwarding**: React POSTs the base64 string to `/api/verification/ocr-scan`. Express verifies session JWT keys and proxies the image payload directly to FastAPI on Port 8001.
3. **OpenCV Crop Filters**: FastAPI decodes the base64 string into a three-dimensional pixel matrix, applying a 5% margin crop to remove background finger noise.
4. **Max-Side Scaling**: The image's longest side is scaled to 600px while maintaining the aspect ratio, decreasing pixel density and speeding up PyTorch matrix operations.
5. **Contrast Optimization**: Generates two complementary variants:
   * **Variant 1 - CLAHE Color (LAB Space)**: Minimizes lighting variations while preserving color.
   * **Variant 2 - Sharpened Otsu Binarization**: Preserves thin characters like `1` or `7`.
6. **EasyOCR Character Inference**: Runs EasyOCR text recognition on the optimized images, restricting character scans to standard digits (`allowlist='0123456789'`) to reduce processing time by 60%.
7. **Token Processing & Cleaning**: Merges split adjacent digit bounding boxes and runs character replacements (such as `O` to `0` or `l` to `1`).
8. **Regex Extraction**: Evaluates the cleaned text against ranked regular expressions to identify and extract the valid employee code candidate.
9. **SQL Verification Check**: FastAPI returns the candidate ID and confidence score to Express. Express queries SQL Server to match the extracted string with the target employee's `emp_code`.
10. **Transaction Commit**: If the IDs match, Express updates the `IssueRecord` status to `Acknowledged` in SQL Server, saves the verification logs, and returns a success response to React to update the UI.

---

## 13. OpenCV & AI Concepts

PROVEXA utilizes specialized computer vision libraries and machine learning frameworks to ensure high-accuracy character recognition on CPUs:

### What?
* **OpenCV**: An open-source computer vision library used to manipulate pixel arrays.
* **EasyOCR**: A deep learning text recognition model that parses preprocessed images through neural networks, translating visual elements into editable text strings.
* **PyTorch**: A machine learning library that serves as the mathematical foundation for running deep neural networks.

### Why?
Raw camera captures often contain shadows, fingers, and background noise. OpenCV cleans the image so the OCR model can read it easily. EasyOCR handles character extraction, and PyTorch manages the matrix algebra and tensor operations needed to run the text recognition model.

### Preprocessing Filters:
* **CLAHE (Contrast Limited Adaptive Histogram Equalization)**:
  Splits the image into small grids, normalizing contrast locally to prevent lighting variations from obscuring text:
  ```python
  clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
  ```
* **Otsu's Thresholding**:
  Automatically calculates the optimal threshold value to convert grayscale images to black-and-white (binarization), handling card variations cleanly.
* **Sharpening**:
  Applies an unsharp mask to sharpen character edges, helping preserve thin digit strokes (such as `1` or `7`) that might otherwise be blurred by standard cameras.
* **Digit Allowlist Optimization**:
  Restricting character recognition strictly to digits (`0123456789`) prevents the PyTorch engine from checking millions of alphabetical and symbolic candidate characters, reducing CPU processing time by **over 60%**.

---

## 14. Digital Signature Workflow

The electronic signature system provides secure, touchscreen-compatible handover proof:

```
  React Canvas Draw ──► base64 PNG Export ──► API Upload ──► Server Write to Disk ──► Path saved in DB
```

1. **HTML5 Canvas Capture**: The `react-signature-canvas` component tracks mouse or screen touch inputs inside an HTML5 `<canvas>` element, mapping coordinate vectors.
2. **Base64 String Conversion**: Clicking submit converts the canvas drawing vectors into a compressed, lightweight base64 PNG image string.
3. **API Upload**: React POSTs the base64 string payload to the Express server at `/api/issues/acknowledge/:id`.
4. **Disk Storage**: The server decodes the base64 string into binary data and saves the signature file to disk at `server/public/uploads/signatures/verify-xxx.png` using a unique UUID filename.
5. **Database Referencing**: Saves the public access path (e.g. `/public/uploads/signatures/verify-xxx.png`) in the corresponding record's `signature_path` field, creating an accessible digital audit record.

---

## 15. Asset Allocation Workflow

The **Eligibility Engine** calculates and validates asset allotments at runtime, enforcing specific corporate distribution rules:

* **Issue Request**: Supervisors trigger the issue workflow. Items are marked as `Pending Acknowledgement` before verification.
* **Quota and Eligibility Checks**: Enforces first-90-day Joining Kits, standard annual uniform quotas, departmental safety shoes, Union linen distributions, and operator soap cycles.
* **Alternative Attire Policies**: Swaps standard garments for Chudidhar packages automatically for female employees.
* **Verification Proofs**: Captures signature drawings, OCR confidence scores, and raw scanned text, updating the transaction status to `Acknowledged` and creating a digital proof sheet.
* **Replacement and Exchange Processing**: Enforces returned old-asset confirmation checks before exchanges can be completed.
* **Return Condition Auditing**: Marks returned assets as `Good`, `Damaged`, or `Salvaged`, dynamically adjusting inventory levels.

---

## 16. Reporting & Excel Export System

The reporting engine processes and streams formatted spreadsheets using `exceljs` and `xlsx`:

* **Multi-Filter Parameter Aggregation**: Filters database records on the backend using query parameters (such as department, date range, verification method, and request status).
* **High-Density Spreadsheet Compilation**: Generates customized tables with styled headers, auto-fit columns, and correct data formats.
* **Streaming Binary Response**: Streams the compiled workbook directly to the browser as a binary blob with a date-stamped filename, ensuring fast and memory-efficient downloads.
* **Administrative and Payroll Auditing**: Financial exports capture employee-signed costs and transaction reasons, streamlining monthly payroll deductions and accounts auditing.

---

## 17. Authentication & JWT Flow

PROVEXA implements secure, stateless authentication to protect administrative endpoints:

```
  Admin Login ──► validate credentials ──► JWT generation ──► HttpOnly Cookie ──► Route Protection
```

### What?
A JSON Web Token (JWT) is a signed text string used for stateless user session validation.

### Why?
Because HTTP APIs are stateless, they do not remember who you are from one request to the next. JWTs allow the backend to verify the admin's identity on every request without continuously querying the database for session records.

### Execution:
1. **Login validation**: The supervisor enters credentials, and the backend verifies the password using `bcryptjs` with 10 hashing rounds.
2. **Token generation**: Generates a secure JSON Web Token (JWT) signed with a secure, random environment key, configuring a standard 24-hour expiration.
3. **Cookie Security**: Transmits the token inside an `HttpOnly`, `Secure` SameSite cookie. This blocks client-side scripts from reading the token, protecting it against Cross-Site Scripting (XSS) attacks.
4. **Validation Middleware**: Subsequent API requests verify the cookie token. If the token is invalid or expired, the middleware clears the cookie and redirects the user to the login screen.

---

## 18. API Communication Flow

### What?
REST (Representational State Transfer) is a software architecture style that defines a set of constraints to be used for creating web services.

### Why?
Standardizing API communication with REST ensures that independent systems—the React frontend, Node backend, and Python OCR microservice—can transfer data reliably using structured JSON payloads.

### Request Lifecycle:
* **GET**: Requests data from a specified resource (e.g. `GET /api/employees`).
* **POST**: Submits data to be processed to a specified resource (e.g. `POST /api/issues`).
* **PUT**: Replaces all current representations of the target resource with the request payload (e.g. `PUT /api/replacements/:id/approve`).

```
  React Client ─── GET /api/employees ───► Express Server ─── Queries ───► SQL Server
  React Client ◄─── JSON Payload ◄──────── Express Server ◄── Result ◄──── SQL Server
```

---

## 19. Mobile & Tablet Support

PROVEXA is fully optimized for on-the-go warehouse operations:
* **Fluid Layout Grid**: Built using responsive Tailwind flex-box and grid systems, adapting automatically to different screen sizes.
* **Touch-Friendly Controls**: Features larger button click surfaces and simplified navigation tables suited for mobile devices.
* **Responsive Video Scanner Overlay**: Adjusts the camera overlay and viewport dynamically to match device screen heights and ratios.
* **Cross-Browser Compatibility**: Runs smoothly across Android Chrome, iOS Safari, and tablet browsers.

---

## 20. Camera Permission Setup

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

## 21. Local Network (LAN) Access

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

## 22. Production Deployment Architecture

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

## 23. SQL Server + PM2 + IIS Explanation

Deployments on Windows Server use a robust, production-ready process layout:
* **Microsoft IIS**: A Windows web server that hosts pre-built static React builds on standard web ports (80/443) and routes API requests to the backend Node service using the `iisnode` extension.
* **PM2 background manager**: Runs the backend Node service in the background, automatically restarting the process if it encounters unhandled exceptions or crashes.
* **SQL Server Express**: Runs as a local service listening on Port 1433, providing database transaction safety and secure storage for relational tables.

---

## 24. Deployment on Another Laptop

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

### Step 3: Database Configuration
1. Open SSMS, connect to the database instance, and create a SQL user named `provexa_user` with password `Provexa@123`.
2. Restore the database using a `.bak` backup file (see **Section 26** for detailed restore scripts).

### Step 4: Environment Variables & Running
1. Setup the `.env` configuration files inside both the `server/` and `client/` directories.
2. Install Node and Python dependencies and start all three services using separate terminal windows.

---

## 25. Git Clone & Git Pull

Git is a distributed version control system used to track changes and synchronize files across different deployment machines:

* **`git clone <repo_url>`**:
  Downloads a complete copy of the remote repository and its file history onto a new computer:
  ```bash
  git clone https://github.com/Keerthana2225/PROVEXA.git
  ```
* **`git pull`**:
  Downloads and merges the latest updates from the remote repository, keeping local development files in sync:
  ```bash
  git pull origin main
  ```

---

## 26. SQL Backup & Restore

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

## 27. Environment Variables

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

## 28. Installation Steps

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

## 29. Running the Entire System

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

## 30. Postman API Testing

Postman is a popular tool used by developers to test backend APIs independently before connecting them to a user interface:

1. **Obtain Authentication**:
   * Set the request dropdown to `POST` and enter the URL: `http://localhost:5000/api/auth/login`
   * Go to the **Body** tab, select **raw** with **JSON** format, and paste standard admin credentials:
     ```json
     { "email": "admin@provexa.com", "password": "admin" }
     ```
   * Click **Send**. The server returns a `200 OK` response. Because PROVEXA uses cookie-based authentication, Postman captures and stores the returned JWT authentication cookie automatically in its cookie store.
2. **Access Secure Endpoints**:
   * Open a new tab in Postman, set the request to `GET`, and enter: `http://localhost:5000/api/employees?page=1`
   * Click **Send**. Because Postman attaches the stored authentication cookie automatically, Express validates the JWT session and returns a JSON list of employees.

---

## 31. Offline vs Online Usage

* **PROVEXA is designed to run 100% offline.**
* **Intranet Portability**: Because all servers—the React client, Node server, SQL Server, and Python OCR microservice—run locally, the entire system can operate on a local Wi-Fi router.
* **Cached Weights**: The only time the OCR service requires an internet connection is during the very first run to download EasyOCR character model weights. Once cached locally inside the user's home folder (`~/.EasyOCR/`), the system becomes completely offline-ready.

---

## 32. Technical Concepts & Operational Notes

To help you understand the core system, here is a breakdown of every specific concept:
* **Server**: A software application or hardware device that processes requests and delivers data to other computers over a network.
* **Port**: A virtual data connection point that systems use to filter network traffic (e.g. standard React runs on Port 5173; Express backend runs on Port 5000).
* **API (Application Programming Interface)**: A bridge that allows different software systems to communicate and transfer data using standard rules.
* **Microservice**: A software design pattern where an application is split into small, independent, loosely coupled services that communicate using lightweight protocols.
* **Hosting**: The process of running and maintaining application files on a web server so they can be accessed over a network.
* **Database Service**: A specialized software program that manages structured data storage, retrieval, and relational safety checks.
* **Intranet**: A private, restricted computer network that allows devices to connect and share data securely without using the public internet.

---

## 33. Troubleshooting & Common Errors

* **Error: `ConnectionError: Port 1433 not open`**
  * *Reason*: SQL Server is not accepting TCP/IP connections, or the service is not running.
  * *Solution*: Open **SQL Server Configuration Manager**, navigate to **Protocols for SQLEXPRESS**, right-click **TCP/IP**, and click **Enable**. Restart the SQL Server service in Windows Services.

* **Error: `EasyOCR download timed out`**
  * *Reason*: Internet connection timed out while downloading model weights on first run.
  * *Solution*: Ensure the laptop has an active internet connection on first run to allow PyTorch to download and cache the weight files in the user profile directory.

* **Error: `Port 8001 already in use`**
  * *Reason*: Another background instance of the FastAPI service is running.
  * *Solution*: Double-click the **`ocr.bat`** file in the root folder. The batch script automatically kills any process running on Port 8001 before starting the service.

* **Error: `Camera Permission Blocked on Mobile Device`**
  * *Reason*: Browser blocks camera access on unsecured HTTP connections.
  * *Solution*: Bypass browser security checks in Chrome by navigating to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, entering the local IP address, enabling the bypass setting, and restarting the browser.

---

## 34. Future Enhancements

* **LDAP & Active Directory Support**: Allow administrators to log in using standard corporate Active Directory credentials.
* **RFID Smart-Badge Integration**: Enable contactless issuing by replacing standard camera scans with fast RFID card reads.
* **Cloud Database Synchronization**: Sync local SQL Server records with secure cloud databases for off-site reporting.
* **Predictive Inventory Modeling**: Analyze historical asset distribution data to help stores predict inventory requirements before upcoming cycles.

---

## 35. Conclusion

**PROVEXA** provides a secure, efficient, and modern approach to enterprise asset management. By integrating computer vision-based badge scanning and touchscreen signature capture, it replaces manual logs with a zero-trust digital audit trail. 

Built on a decoupled client-server architecture, transactional database storage, and lightweight CPU processing, PROVEXA is an ideal, presentation-ready solution for final year projects, technical reviews, and enterprise-scale deployments.
