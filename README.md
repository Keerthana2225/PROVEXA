# Provexa – Employee Asset & Replacement Management System
### Deep Technical Documentation

## 1. Project Overview

* **What the project does**: Provexa is a comprehensive digital solution designed to track, manage, and replace physical assets (such as safety gear, uniforms, tools, and electronics) issued to employees. It transitions companies from error-prone, paper-based tracking to a secure, centralized digital platform.
* **Core functionality**:
  * **Digital Acknowledgement**: Capturing real-time digital signatures from employees as proof of receipt.
  * **Asset Lifecycle Tracking**: Monitoring when items are issued, when they are due for replacement, and logging their return.
  * **Replacement Workflows**: Handling employee requests for damaged or expired items, subject to admin approval.
  * **Automated Auditing**: Generating detailed professional reports (Excel/PDF) and triggering automated checks for overdue items.

---

## 2. System Architecture

Provexa is built on the **MERN** stack (MongoDB, Express.js, React.js, Node.js), utilizing a decoupled client-server architecture.

* **Frontend (Client)**: A Single Page Application (SPA) built with React that provides a dynamic, responsive user interface. It runs in the user's browser and communicates with the backend asynchronously.
* **Backend (API Server)**: A RESTful API built with Node.js and Express.js that handles business logic, authentication, and data validation.
* **Database**: MongoDB serves as the NoSQL data store, handling flexible, document-based data persistence.
* **Data Flow (UI → API → DB → Response)**:
  1. A user interacts with the UI (e.g., clicking the "Assign Item" button).
  2. The Frontend (using Axios) sends an HTTP POST request containing a JSON payload to the API Server.
  3. The Backend (Express) routes the request, verifies the user's JWT token via Middleware, and validates the incoming data.
  4. The Controller interprets the request and interacts with the Database via Mongoose models.
  5. MongoDB saves the new document and returns a success status back to the Node server.
  6. The Backend sends a JSON response (e.g., `201 Created` status with the saved data) back to the Frontend.
  7. The Frontend receives the response, updates the application state (via React Query), and updates the UI to show a success message.

---

## 3. Technologies Used (Detailed Breakdown)

### Frontend Technologies

* **React**:
  * **Full Form**: React (It does not stand for anything).
  * **What it is**: A JavaScript library for building interactive user interfaces based on independent, reusable pieces of code called components.
  * **Why used**: It efficiently manages state and re-renders only the components that need to change, making complex dashboards fast and responsive.
  * **Where used**: The foundation of the entire client-side application.
* **Vite**:
  * **Full Form**: Vite (French word for "fast").
  * **What it is**: A modern frontend build tool and development server.
  * **Why used**: Provides incredibly fast Hot Module Replacement (HMR) during development (meaning changes appear instantly without refreshing) and highly optimized static files for production.
  * **Where used**: Powers the frontend development environment.
* **Tailwind CSS**:
  * **Full Form**: Tailwind Cascading Style Sheets.
  * **What it is**: A utility-first CSS framework.
  * **Why used**: Enables rapid styling directly inside React HTML elements using predefined classes (like `bg-blue-500`), avoiding messy custom CSS files.
  * **Where used**: Used for all visual styling, layout, and responsiveness across the app.
* **TanStack Query (React Query)**:
  * **Full Form**: Not an abbreviation.
  * **What it is**: A powerful data synchronization and fetching library for React.
  * **Why used**: It automatically handles complex background tasks like caching API responses, showing loading spinners, and retrying failed requests. It replaces manual data fetching logic.
  * **Where used**: Used globally in the frontend to wrap Axios requests and fetch data (like asset lists).
* **React Router DOM**:
  * **Full Form**: React Router Document Object Model.
  * **What it is**: The standard routing library for React applications.
  * **Why used**: Enables client-side routing, allowing users to navigate between different pages (like Dashboard to Reports) without the browser reloading the page.
  * **Where used**: In the main application file to define URL paths.
* **Recharts**:
  * **Full Form**: React Charts.
  * **What it is**: A composable charting library built on React components.
  * **Why used**: To visualize data beautifully and interactively.
  * **Where used**: In the Dashboard to display analytics graphs.
* **Axios**:
  * **Full Form**: Not an abbreviation.
  * **What it is**: A promise-based HTTP client for the browser.
  * **Why used**: It provides a cleaner syntax than standard `fetch()`, automatically transforms JSON data, and makes it easy to attach Authorization headers globally.
  * **Where used**: Inside React Query functions to communicate with the Express API.
* **React Signature Canvas**:
  * **What it is**: A React wrapper around HTML5 Canvas for drawing.
  * **Why used**: Allows employees to physically sign their names on a touchscreen or with a mouse.
  * **Where used**: On the asset assignment and acknowledgment pages.

### Backend Technologies

* **Node.js**:
  * **Full Form**: Node JavaScript.
  * **What it is**: A JavaScript runtime environment that executes code outside a web browser.
  * **Why used**: Allows developers to use JavaScript for server-side scripting. It uses a non-blocking, event-driven architecture, making it highly efficient for building APIs that handle many requests.
  * **Where used**: The core engine running the entire backend server.
* **Express.js**:
  * **Full Form**: Express JavaScript.
  * **What it is**: A minimal and flexible Node.js web application framework.
  * **Why used**: It dramatically simplifies the creation of robust APIs, making it easy to handle URL routing, middleware integration, and HTTP requests/responses.
  * **Where used**: The framework wrapping Node.js to define API endpoints (e.g., `app.get('/api/users')`).
* **MongoDB**:
  * **Full Form**: Derived from the word "humongous" Database.
  * **What it is**: A popular NoSQL, document-oriented database.
  * **Why used**: Instead of rigid tables, it stores data in flexible, JSON-like documents. This makes it highly adaptable to changing data structures.
  * **Where used**: The primary, permanent data storage solution.
* **Mongoose**:
  * **Full Form**: Not an abbreviation.
  * **What it is**: An Object Data Modeling (ODM) library for MongoDB and Node.js.
  * **Why used**: MongoDB is *too* flexible; Mongoose enforces structure (Schemas) onto the data, complete with built-in validation, type casting, and query building functions.
  * **Where used**: In the backend `models` directory to define how a database record should look.
* **JWT (JSON Web Token)**:
  * **Full Form**: JavaScript Object Notation Web Token.
  * **What it is**: A secure standard for transmitting information between parties as a JSON object.
  * **Why used**: To implement stateless authentication. When an admin logs in, they get a JWT. They send this token with future requests to prove their identity without the server needing to remember their session.
  * **Where used**: Generated during login and verified in API middleware.
* **bcryptjs**:
  * **Full Form**: bcrypt JavaScript (based on the Blowfish cipher).
  * **What it is**: A cryptographic password-hashing function.
  * **Why used**: To securely hash passwords before storing them in the database. If the database is hacked, the passwords remain unreadable.
  * **Where used**: During user creation and login verification logic.
* **ExcelJS**:
  * **Full Form**: Excel JavaScript.
  * **What it is**: A library to read, manipulate, and write spreadsheet data.
  * **Why used**: To programmatically generate professional, styled Excel reports that can embed employee signature images directly into the spreadsheet cells.
  * **Where used**: In the backend reporting APIs.
* **PDFKit**:
  * **Full Form**: Portable Document Format Kit.
  * **What it is**: A complex PDF generation library for Node.js.
  * **Why used**: To generate official, non-editable, printable PDF receipts or audit reports for asset assignments.
  * **Where used**: In the backend export APIs.
* **Node-Cron**:
  * **Full Form**: Node cron (derived from the Greek word chronos, meaning time).
  * **What it is**: A task scheduler in pure JavaScript.
  * **Why used**: To automate recurring backend tasks, such as scanning the database daily to flag items that have exceeded their replacement due date.
  * **Where used**: In the backend `jobs` folder.

---

## 4. API Explanation (Deep Dive)

### How APIs are Structured
Provexa APIs follow REST (Representational State Transfer) principles. They are structured around "resources" (nouns like `/api/employees`, `/api/issues`).

### HTTP Methods
*   **GET**: Retrieve data (e.g., Get a list of all assigned assets).
*   **POST**: Create new data (e.g., Assign a new asset and submit a signature).
*   **PUT** / **PATCH**: Update existing data (e.g., Mark an item as "Returned").
*   **DELETE**: Remove data (e.g., Delete an invalid record).

### Request & Response Flow
1.  **Request**: The Client sends a request to an endpoint with headers (like Auth) and a body (data).
2.  **Routing**: The Express Server matches the URL and HTTP method to a specific route.
3.  **Middleware**: The request passes through middleware (e.g., verifying the JWT).
4.  **Controller Logic**: The controller function executes, queries MongoDB via Mongoose, and formats a result.
5.  **Response**: The server sends back a JSON response along with an HTTP Status Code (`200 OK` for success, `404 Not Found`, `500 Server Error`).

### Authentication using JWT
1.  Admin posts email/password to `/api/auth/login`.
2.  Backend compares the hashed password. If correct, it generates a JWT containing the user's ID, signs it with a secret key (`JWT_SECRET`), and sends it back.
3.  The frontend stores this token.
4.  For every future request, the frontend sends the token in the HTTP Header: `Authorization: Bearer <token>`.

### Middleware Working
Middleware are functions that sit between the raw request and the final controller.
*   **Auth Middleware**: Extracts the token from the header, mathematically verifies its signature using the secret key, and attaches the user's details to the `req` object. If invalid, it blocks the request (`401 Unauthorized`).

### Example APIs
*   **Login**: `POST /api/auth/login` → Accepts `{ email, password }`, returns `{ token, user }`.
*   **Asset Assign**: `POST /api/issues` → Accepts `{ employeeId, itemId, signatureImage }`, saves to DB, returns the created issue record.
*   **Replacement Request**: `POST /api/replacements` → Accepts `{ issueId, reason }`, updates DB status to pending.

---

## 5. How to Test APIs in Postman

Postman is an application that allows developers to simulate the frontend and send raw HTTP requests directly to the backend.

### Step-by-Step Process:
1.  Open **Postman** and ensure your local backend server is running (`npm run dev`).
2.  Click the **+** button to create a new Request tab.

### How to Send Requests (GET/POST)
*   **For a GET Request (Fetching Data)**:
    1.  Select `GET` from the method dropdown.
    2.  Enter the URL: `http://localhost:5000/api/employees`
    3.  Click **Send**. The JSON data will appear in the bottom pane.

*   **For a POST Request (Sending JSON Body)**:
    1.  Select `POST` from the method dropdown.
    2.  Enter the URL: `http://localhost:5000/api/auth/login`
    3.  Click on the **Body** tab (below the URL bar).
    4.  Select the **raw** radio button.
    5.  Change the text format dropdown on the right from "Text" to **JSON**.
    6.  Enter the payload:
        ```json
        {
          "email": "admin@provexa.com",
          "password": "password123"
        }
        ```
    7.  Click **Send**.

### How to Add an Authorization Token (JWT)
If you try to hit a protected route, you will get an error. You must prove who you are.
1.  Execute the Login request above. Look at the response at the bottom and copy the long string under `"token"`.
2.  Open your protected request (e.g., `GET /api/issues`).
3.  Click the **Authorization** tab.
4.  Change the Type dropdown to **Bearer Token**.
5.  Paste your copied token into the Token field.
6.  Click **Send**. Postman automatically translates this into the correct HTTP headers.

---

## 6. Backend Explanation

### Folder Structure
*   `routes/`: Acts as the traffic cop. Maps URLs to specific controller functions.
*   `controllers/`: The brains. Contains the core logic for processing requests, calculating data, and talking to models.
*   `models/`: Defines database schemas.
*   `middleware/`: Security guards and utilities (Auth checks).
*   `jobs/`: Automated scheduled tasks.

### Code Execution Flow
When a request hits `GET /api/employees`:
1.  `index.js` routes `/api/employees` to the employee **Routes** file.
2.  The **Route** file sees it's a `GET` request and passes it to the `getAllEmployees` **Controller**.
3.  The **Controller** calls `Employee.find()` using the Mongoose **Model**.
4.  The result is sent back to the client via `res.json()`.

---

## 7. MongoDB & Mongoose Explanation

### What MongoDB is and How it Stores Data
MongoDB is a NoSQL database. Instead of strict Excel-like tables, it uses concepts of:
*   **Collections**: Like a folder or a table (e.g., the `employees` collection).
*   **Documents**: Like a file or a row. Each document is a flexible JSON object.

### Schema Creation using Mongoose
MongoDB allows saving *anything*. Mongoose brings order by enforcing a Schema:
```javascript
const issueSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
  status: { type: String, default: 'Issued' },
  signature: { type: String, required: true }
});
```

### CRUD Operations
*   **Create**: `Issue.create({ data })`
*   **Read**: `Issue.find({})` or `Issue.findById(id)`
*   **Update**: `Issue.findByIdAndUpdate(id, { status: 'Returned' })`
*   **Delete**: `Issue.findByIdAndDelete(id)`

### How Relationships Work (Populate)
NoSQL databases don't have SQL `JOIN`s. Instead, Mongoose uses `.populate()`. If an `Issue` document only stores the `employeeId`, calling `Issue.find().populate('employeeId')` tells Mongoose to take that ID, look up the full employee details in the Employee collection, and inject the full object into the results automatically.

### How to View Data in MongoDB Compass
1.  Open **MongoDB Compass** on your computer.
2.  In the connection string, paste `mongodb://localhost:27017` and click **Connect**.
3.  On the left, find the `provexa` database.
4.  Click on any collection (e.g., `issues`) to visually browse, edit, or delete the raw JSON records.

---

## 8. Frontend Explanation

### Pages and Components
The frontend is built using component-based architecture. A main `Dashboard.jsx` page is simply a container that imports smaller, reusable components like `<Sidebar />`, `<Navbar />`, and `<StatCard />`.

### Routing
React Router handles navigation completely within the browser. The browser doesn't request a new HTML page from the server; React Router simply swaps out which React components are currently visible based on the URL bar.

### API Integration & Data Fetching
Instead of using standard `useEffect` loops which get complicated quickly, the app uses **React Query** combined with **Axios**.
*   **Axios** handles the raw HTTP request and automatically attaches the JWT token.
*   **React Query** wraps Axios. It provides variables like `isLoading`, `isError`, and `data` instantly to the UI, while automatically caching the data so navigating back to a page doesn't require a second API call.

---

## 9. Features Breakdown

*   **Asset Tracking**: When an item is issued, the system generates an `IssueRecord`. This record links an Employee, an Item, and the digital Signature. It tracks the status (`Issued`, `Returned`, `Replaced`).
*   **Replacement System**: Employees can flag items as damaged. This creates a request that sits in an admin queue. Admins review the request, and upon approval, the old item is archived, and a new `IssueRecord` is generated for the replacement.
*   **Dashboard**: The central hub. The backend aggregates data (using MongoDB `$group` and `$count` queries) to feed real-time statistics to the frontend Recharts graphs.
*   **Reports**: Admins can specify date ranges and departments. The frontend sends these filters as query parameters to the backend, which queries the database and formats the output.
*   **Authentication**: Locks the entire application behind a secure login screen, ensuring only authorized personnel can manipulate asset records.

---

## 10. File Handling

*   **Digital Signatures**: When an employee signs on the canvas, the drawing is converted into a **Base64 string** (a very long string of text that mathematically represents the image). This string is sent to the backend and stored directly in the database.
*   **Excel Generation**: Using `ExcelJS`, the backend loops through database records and programmatically constructs a spreadsheet. If signatures are requested, it takes the Base64 strings, decodes them back into image buffers, calculates cell dimensions, and embeds the images directly into the Excel file rows before triggering a download.
*   **PDF Generation**: Using `PDFKit`, the backend draws text and lines programmatically to create a formatted document (like a receipt). It streams this data directly to the user's browser as a downloadable file.

---

## 11. Automation

### How Node-Cron Works
Node-Cron allows the Node.js server to run tasks on a schedule, acting like a built-in alarm clock. It runs entirely in the background without user interaction.

### How Overdue Items are Detected Automatically
A cron job is set up with an expression like `0 0 * * *` (which means "run at 00:00 every day"). 
When midnight hits, a script runs that asks MongoDB: *"Find all items where the status is 'Issued', and the expected 'returnDate' is older than today."*
The script automatically updates the status of those specific records to `Overdue`. When the admin logs in the next morning, the dashboard immediately reflects the overdue items without anyone having to click a "Check Dates" button.

---

## 12. Setup & Run Instructions

### Environment Variables
Environment variables keep sensitive data out of the source code. Create a file named `.env` in your `server` folder:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/provexa
JWT_SECRET=your_super_secret_key_change_this
```

### Backend Setup
1.  Open your terminal and navigate to the backend folder: `cd server`
2.  Install all required packages: `npm install`
3.  (Optional) Run seed scripts to create an initial admin user: `npm run seed`
4.  Start the development server: `npm run dev`
    *(The backend will start on http://localhost:5000)*

### Frontend Setup
1.  Open a second terminal window and navigate to the frontend folder: `cd client`
2.  Install all required packages: `npm install`
3.  Start the Vite development server: `npm run dev`

### Running the Project
Once both servers are running locally, open your web browser and navigate to the link provided by the Vite terminal (typically `http://localhost:5173`). You can now log in and use the Provexa system.
