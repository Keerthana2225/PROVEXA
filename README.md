# Provexa – Employee Welfare Management and Digital Acknowledgement System
### Deep Technical Documentation

## 1. Project Overview

### Introduction
*   **Problem Statement**: Many corporate and industrial workplaces rely on manual, paper-based tracking systems to manage items given to employees (like safety gear, uniforms, and tools). These manual methods are inefficient, prone to physical damage or loss, and make it incredibly difficult to audit who has what, or when items are due for replacement.
*   **Need for the System**: A centralized, digital solution is required to instantly capture employee sentiments, automatically track the lifecycle of physical assets, and provide administrative staff with actionable, real-time data regarding unreturned or damaged items.

### Objectives
*   **Digitize Acknowledgment**: Replace paper signatures with real-time digital signature capture.
*   **Improve Asset Tracking**: Implement automated logic to instantly highlight overdue items, preventing inventory loss.
*   **Provide Analytics**: Empower decision-makers with comprehensive, day-wise, and department-wise reporting dashboards.

---

## 2. Exhaustive Feature List (Everything Included)
We have packed this system with every feature necessary for a true industry-level production environment:

*   **Digital Signature Capture**: Utilizes HTML5 Canvas via React to allow employees to physically sign their names on a tablet or desktop. The system converts this drawing into a Base64 image and embeds it into official records.
*   **Intelligent Overdue Detection**: A backend background job runs constantly, checking the system clock against the `returnDate` of all issued items, automatically flagging them as "Overdue" without manual input.
*   **Advanced Replacement Workflow**: Employees can flag damaged items. Admins get a dedicated queue to approve or reject replacements. Approved requests automatically archive the old record and generate a new issue cycle.
*   **Web Dashboard Analytics**: Visual representation of data through Recharts graphs and KPIs, providing day-wise and status-wise reporting on asset distribution.
*   **Native Excel & PDF Exports**: The backend generates downloadable `.xlsx` and `.pdf` reports dynamically. The Excel export intelligently embeds the actual image of the employee's signature directly inside the spreadsheet cells.
*   **Secure Authentication**: A fully protected admin portal using JWT (JSON Web Tokens) and bcrypt password hashing to ensure data security.

---

## 3. System Architecture

The system operates on a modern 3-tier architecture using the **MERN** stack:
1.  **Frontend (Client)**: A Single Page Application (React.js) acting as the UI.
2.  **Backend API (Server)**: The brain of the system (Node.js/Express.js). It processes incoming data, performs validation, calculates due dates, and handles file generation.
3.  **Database**: MongoDB safely stores all the structured records as flexible JSON documents.

### Modules Description
*   **Authentication Module**: Handles secure admin login, password verification, and JWT token generation.
*   **Employee & Item Master Module**: The core CRUD interface to manage the workforce and the inventory catalog.
*   **Issue Tracking Module**: The core engine where items are assigned to employees, signatures are captured, and return dates are calculated.
*   **Replacement Module**: Handles the lifecycle of damaged or expired items, moving them from "Pending Approval" to "Archived".
*   **Analytics & Reporting Module**: Code on the server that aggregates database data (averages, counts) for the React dashboard and generates Excel/PDF files for official record-keeping.
*   **Automation Module**: A time-based algorithm (Node-Cron) that automatically scans the database at midnight to flag overdue returns.

### Database Design
The core table (collection) structure:
*   **Employee Collection**: `_id`, `empId`, `name`, `department`, `designation`.
*   **Item Collection**: `_id`, `name`, `category`, `replacementCycleDays` (Integer).
*   **IssueRecord Collection**: 
    *   `_id` (Primary Key)
    *   `employeeId`, `itemId` (Foreign Keys via Mongoose `ObjectId`)
    *   `issueDate`, `returnDate` (Date)
    *   `status` (String: Issued, Returned, Replaced, Overdue)
    *   `signature` (String: Base64 Image Data)
    *   `remarks` (String)

---

## 4. Code Workflow Explanation

1.  **User Interaction**: An administrator opens the React Web App and selects an employee and an item to assign.
2.  **Input & Validation**: The employee signs on the digital canvas. The React state ensures all required fields and the signature are present before allowing submission.
3.  **Submission**: The React app uses Axios to send a POST request with the data payload (including the Base64 signature string) to the Node.js backend.
4.  **Backend Processing**: Express.js receives the request. The Auth Middleware verifies the admin's JWT token. The Controller calculates the `returnDate` based on the item's `replacementCycleDays`.
5.  **Database Storage**: Mongoose validates the schema structure and commits the structured record to the MongoDB database.
6.  **Admin Review**: The dashboard makes GET requests using React Query to retrieve the latest data and draws the updated graphs on the screen instantly.

---

## 5. Tools and Technologies Used (Deep Dive)

To provide a complete understanding, here is a breakdown of every specific tool utilized, with explanations of what they mean and why they were chosen:

### Frontend Technologies
*   **React.js**: A component-based JavaScript library for building user interfaces.
    *   *Why?* It efficiently manages state and re-renders only the components that need to change, making complex dashboards fast and responsive.
*   **Vite**: A modern frontend build tool.
    *   *Why?* Provides incredibly fast Hot Module Replacement (HMR) during development, meaning changes appear instantly without refreshing.
*   **Tailwind CSS**: A utility-first CSS framework.
    *   *Why?* Enables rapid styling directly inside HTML elements using predefined classes, avoiding messy custom CSS files and ensuring consistent design.
*   **TanStack Query (React Query)**: A powerful data synchronization library.
    *   *Why?* It automatically handles complex background tasks like caching API responses, showing loading spinners, and retrying failed requests, replacing manual `useEffect` logic.
*   **React Router DOM**: The standard routing library for React.
    *   *Why?* Enables client-side routing, allowing users to navigate between pages instantly without the browser reloading.
*   **Recharts**: A composable charting library.
    *   *Why?* Used to generate the beautiful, interactive bar charts and pie charts on the admin dashboard to visually represent raw analytics data.
*   **Axios**: A promise-based HTTP client.
    *   *Why?* Used to make HTTP requests to the backend. It automatically transforms JSON data and makes it easy to attach Authorization headers globally.
*   **React Signature Canvas**: A React wrapper around HTML5 Canvas.
    *   *Why?* Allows employees to physically sign their names on a touchscreen or with a mouse, converting the drawing into digital data.
*   **Lucide React**: An open-source icon library.
    *   *Why?* Provides clean, customizable vector icons used throughout the UI for navigation menus, buttons, and status indicators.
*   **TanStack React Table**: A headless UI framework for building tables.
    *   *Why?* Allows for building highly performant, paginated, sortable, and filterable data grids (used for the massive employee and asset lists).
*   **Day.js**: A minimalist JavaScript date library.
    *   *Why?* Used to easily parse, validate, and format complex date/time strings (like formatting `returnDate` for human readability) in both frontend and backend.
*   **clsx & Tailwind-Merge**: Utility libraries.
    *   *Why?* Used together to conditionally join Tailwind CSS classes dynamically without style conflicts (critical for building reusable UI components).

### Backend Technologies
*   **Node.js**: A JavaScript runtime environment.
    *   *Why?* Allows developers to use JavaScript for server-side scripting. Its non-blocking, event-driven architecture makes it highly efficient for APIs.
*   **Express.js**: A minimal Node.js web framework.
    *   *Why?* It dramatically simplifies the creation of robust APIs, making it easy to handle URL routing and middleware integration.
*   **MongoDB**: A NoSQL, document-oriented database.
    *   *Why?* Instead of rigid tables, it stores data in flexible, JSON-like documents, making it highly adaptable to changing data structures.
*   **Mongoose**: An Object Data Modeling (ODM) library.
    *   *Why?* MongoDB is too flexible; Mongoose enforces structure (Schemas) onto the data, complete with built-in validation and type casting to prevent bad data from crashing the DB.
*   **JWT (JSON Web Token)**: A secure standard for transmitting information.
    *   *Why?* Used for stateless authentication. Admins log in once, receive a token, and send it with future requests to prove their identity securely.
*   **bcryptjs**: A cryptographic password-hashing function.
    *   *Why?* Secures passwords in the database. If the database is hacked, the hashed passwords remain unreadable.
*   **ExcelJS**: A Node.js library for spreadsheet manipulation.
    *   *Why?* Used to programmatically generate official Excel reports. Most importantly, it allows us to decode the Base64 signatures and embed the actual images directly into the spreadsheet cells!
*   **PDFKit**: A complex PDF generation library.
    *   *Why?* Used to generate non-editable, printable PDF receipts or audit reports directly from the server.
*   **Node-Cron**: A task scheduler in pure JavaScript.
    *   *Why?* Used to automate recurring backend tasks, such as scanning the database daily at midnight to flag items that have exceeded their replacement due date automatically.
*   **CORS**: Cross-Origin Resource Sharing middleware.
    *   *Why?* Allows the React frontend (running on a different port like 5173) to safely make HTTP requests to the Express backend (running on port 5000) without browser security blocks.
*   **Dotenv**: Environment variable loader.
    *   *Why?* Loads variables from a `.env` file into `process.env`, keeping secrets (like database connection strings and JWT keys) safely out of the public source code.
*   **Cookie-Parser**: Middleware for handling cookies.
    *   *Why?* Parses cookies attached to the client request object, which is essential if JWTs or session IDs are stored and transmitted via cookies instead of LocalStorage headers.

---

## 6. API Documentation Section

An API (Application Programming Interface) is the bridge that allows the React dashboard to talk to the MongoDB database.

### Core Endpoints:
*   `POST /api/auth/login` → Authenticate admin and receive JWT.
*   `POST /api/issues` → Submit a new asset issue record with a signature.
*   `GET /api/issues/overdue` → Fetch all records flagged as Overdue.
*   `GET /api/analytics/dashboard` → Get aggregated stats for the charts.
*   `GET /api/reports/export-excel` → Generates and downloads the formatted Excel file.

### How to Test APIs using Postman
Here is exactly how to test the core assignment endpoint manually:
1.  Open Postman and click **New Request**.
2.  Change the request method dropdown to **POST**.
3.  In the URL bar, enter: `http://localhost:5000/api/issues`
4.  Go to the **Authorization** tab, select **Bearer Token**, and paste your admin JWT.
5.  Go to the **Body** tab, select **raw**, and change the format to **JSON**.
6.  Paste test data:
    ```json
    {
      "employeeId": "60d5ecb8b392...",
      "itemId": "60d5ecb8b392...",
      "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
    }
    ```
7.  Click **Send**. You should receive a `201 Created` status with the saved record from the database.

---

## 7. Folder Structure Overview

```text
PROVEXA/
│
├── server/                # Node.js/Express Backend
│   ├── controllers/       # Business logic (e.g., issueController.js)
│   ├── models/            # Mongoose Schemas (e.g., Issue.js)
│   ├── routes/            # API URL definitions
│   ├── middleware/        # JWT Verification
│   └── jobs/              # Node-Cron automation tasks
│
├── client/                # React/Vite Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI parts (Navbar, Cards)
│   │   ├── pages/         # Full screens (Dashboard, AssetTracking)
│   │   └── api/           # Axios HTTP request configurations
│
└── README.md              # Project Documentation
```

---

## 8. Setup and Execution Guide

### Backend Execution
Navigate to the backend directory:
```bash
cd server
```
Create a `.env` file and add your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/provexa
JWT_SECRET=your_super_secret_key
```
Install dependencies and run:
```bash
npm install
npm run dev
```

### Frontend Execution
Navigate to the frontend directory:
```bash
cd client
```
Install dependencies and run:
```bash
npm install
npm run dev
```
Open your browser to the local URL provided by Vite (usually `http://localhost:5173`).

---

## 9. GitHub Usage Section

### Clone the Repository
To pull the project code to a new local machine:
```bash
git clone https://github.com/Keerthana2225/PROVEXA.git
```

### Push Changes (Updating Code)
When you modify files, run the following sequence to push updates to GitHub:
```bash
git add .
git commit -m "Describe your updates here"
git push origin main
```

### Pull Updates
To fetch the latest code from the repository:
```bash
git pull origin main
```

---

## 10. Conclusion

The Provexa Employee Welfare Management System successfully digitizes and automates the asset distribution and acknowledgment process. By bridging modern frontend frameworks (React) with a high-performance backend (Node.js/Express) and flexible database (MongoDB), the system ensures that physical inventory and legal acknowledgments are never lost. 

The intelligent integration of automated cron jobs guarantees that overdue items are immediately isolated, while features like embedded digital signatures inside dynamically generated Excel reports provide a massive upgrade over traditional administrative methods. This system allows administrators to take proactive, data-driven actions to manage workforce welfare effectively.
