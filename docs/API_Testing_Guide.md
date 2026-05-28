# PROVEXA — Enterprise API Testing & Postman Integration Guide
### Systems Communications, REST Integrations, and Validation Testing

---

## 1. Document Scope & API Standard

This manual serves as the primary system integration testing reference for developers, quality assurance (QA) engineers, and production support teams. It covers communication interfaces, JSON payloads, authentication state checks, and step-by-step Postman testing guidelines.

PROVEXA communicates using a standard **RESTful API** layout:
* **Payload Format**: Standard JSON (`application/json`).
* **Session Lifecycle Security**: Validates signed JSON Web Tokens (JWT) stored inside secure `HttpOnly` browser cookies.
* **Multipart Payload Support**: Uses `multipart/form-data` handled via Multer middleware to process signature and PDF uploads.

---

## 2. API Communication Topology

```
   ┌───────────┐      1. POST image frame (base64)      ┌───────────┐
   │  React    ├───────────────────────────────────────►│  Express  │
   │  Client   │◄───────────────────────────────────────┤  Backend  │
   └───────────┘       6. Return JSON response          └─────┬─────┘
                                                             │
                                2. Proxies base64 Image    │ 5. Commit
                                                           ▼
   ┌───────────┐               3. Decodes ID            ┌───────────┐
   │  FastAPI  │◄───────────────────────────────────────┤ SQL Server│
   │    OCR    ├───────────────────────────────────────►│ Database  │
   └───────────┘            4. Returns "11333"          └───────────┘
```

1. **Client Capture**: React captures the physical ID card using the web camera and sends the raw base64 frame to Express.
2. **Gateway Verification**: The Express server verifies session permissions and forwards the image to the FastAPI microservice on Port 8001.
3. **OCR Processing**: FastAPI decodes the image, runs OpenCV filters and the EasyOCR text recognition engine, and extracts the ID digits.
4. **Validation Check**: FastAPI returns the extracted ID to Express. Express checks the ID against the target employee record in SQL Server, updating the issue record status to `Acknowledged` if they match.

---

## 3. Core API Route Reference & JSON Payload Specs

### I. Administrator Authentication (`/api/auth`)

#### 1. Administrator Login (`POST /api/auth/login`)
* **Endpoint Purpose**: Authenticate admin credentials and initialize secure sessions.
* **JSON Request Body**:
  ```json
  {
    "email": "admin@provexa.com",
    "password": "admin"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "7b587d55-d142-4541-b0db-31295efbdf91",
      "name": "Super Admin",
      "email": "admin@provexa.com",
      "role": "admin"
    }
  }
  ```
  *(Note: The server returns a secure session JWT inside an `HttpOnly` cookie in the response headers).*

#### 2. Get User Profile Session (`GET /api/auth/me`)
* **Endpoint Purpose**: Retrieve active administrator profile states on client reloads.
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "user": {
      "id": "7b587d55-d142-4541-b0db-31295efbdf91",
      "name": "Super Admin",
      "email": "admin@provexa.com",
      "role": "admin"
    }
  }
  ```

---

### II. Employee Master Management (`/api/employees`)

#### 1. Search and Paginate Employees Directory (`GET /api/employees`)
* **Endpoint Purpose**: Paginate, filter, and search active employee master lists.
* **Query Parameters**:
  * `page` (Integer, Default: `1`)
  * `limit` (Integer, Default: `10`)
  * `search` (String, Optional)
* **Success Response (`200 OK`)**:
  ```json
  {
    "employees": [
      {
        "id": "fcd32c25-827b-402a-9f5b-9d41334cfc92",
        "emp_code": "11333",
        "name": "Venkatesh",
        "department": "Production",
        "designation": "Operator",
        "employee_type": "Permanent",
        "gender": "Male",
        "status": "active",
        "sizes_shirt": "M",
        "sizes_pant": "32",
        "sizes_shoe": "8",
        "created_at": "2026-05-28T09:00:00.000Z"
      }
    ],
    "total": 1,
    "totalPages": 1
  }
  ```

#### 2. Create New Employee Record (`POST /api/employees`)
* **Endpoint Purpose**: Register a new employee and configure baseline attire parameters.
* **JSON Request Body**:
  ```json
  {
    "emp_code": "11335",
    "name": "Ananya Sharma",
    "department": "Quality Assurance",
    "designation": "QA Operator",
    "employee_type": "Permanent",
    "gender": "Female",
    "is_union_member": true,
    "is_alternative_attire": true,
    "sizes": {
      "shirt": "S",
      "pant": "28",
      "shoe": "6"
    }
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "id": "ca587b12-9214-4321-b0db-91285efdca12",
    "emp_code": "11335",
    "name": "Ananya Sharma",
    "department": "Quality Assurance",
    "designation": "QA Operator",
    "employee_type": "Permanent",
    "gender": "Female",
    "is_union_member": true,
    "is_alternative_attire": true,
    "sizes_shirt": "S",
    "sizes_pant": "28",
    "sizes_shoe": "6",
    "status": "active"
  }
  ```

---

### III. Asset Issue & Verification Transactions (`/api/issues`)

#### 1. Bulk Issue Asset Distribution (`POST /api/issues`)
* **Endpoint Purpose**: Distribute multiple items to selected employees simultaneously.
* **JSON Request Body**:
  ```json
  {
    "employee_ids": ["fcd32c25-827b-402a-9f5b-9d41334cfc92"],
    "item_payloads": [
      {
        "item_id": "aa587b12-1422-4321-b0db-11225efdca12",
        "quantity": 1
      }
    ],
    "issued_date": "2026-05-28"
  }
  ```
* **Success Response (`201 Created`)**:
  ```json
  {
    "success": true,
    "message": "Assets issued successfully. Pending verification acknowledgement."
  }
  ```

#### 2. Confirm Asset Handover Handshake (`PUT /api/issues/acknowledge/:id`)
* **Endpoint Purpose**: Confirm asset receipt via signature and identity checks.
* **JSON Request Body**:
  ```json
  {
    "method": "Signature",
    "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
    "ocr_details": {
      "scanned_code": "11333",
      "confidence": 0.94,
      "device_info": "Chrome / Windows 11"
    }
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Asset handover acknowledged successfully."
  }
  ```

---

## 4. Postman Integration Guide: Step-by-Step API Testing

### Step 1: Initialize the Local Project Servers
Ensure the backend Express server is running on Port 5000 and the FastAPI microservice is running on Port 8001.

### Step 2: Establish the Administrative Session
Before you can query protected APIs, authenticate your credentials to establish a session cookie:
1. Open **Postman**, click **New**, and select **HTTP Request**.
2. Change the request method dropdown to **`POST`**.
3. Enter the target login URL in the address bar:
   ```
   http://localhost:5000/api/auth/login
   ```
4. Click the **Body** tab below the address bar, select the **raw** radio button, and change the format dropdown from Text to **JSON**.
5. Paste the test credentials payload into the text area:
   ```json
   {
     "email": "admin@provexa.com",
     "password": "admin"
   }
   ```
6. Click **Send**. You should receive a `200 OK` response. Postman automatically intercepts and stores the returned JWT authentication cookie in its cookie jar.

```
  Postman POST Login ──► JWT Cookie Intercepted ──► Auto-Attached on Subsequent calls
```

### Step 3: Test a Protected Employee Search Route
Verify that the server parses the session cookie correctly:
1. Open a new tab in Postman and select the **`GET`** method.
2. Enter the target URL in the address bar:
   ```
   http://localhost:5000/api/employees?page=1
   ```
3. Click **Send**. Because Postman attaches the stored session cookie automatically, Express validates the JWT session and returns a JSON list of employees:
   ```json
   {
     "employees": [
       { "id": "fcd32c25-827b-402a-9f5b-9d41334cfc92", "emp_code": "11333", "name": "Venkatesh" }
     ],
     "total": 1,
     "totalPages": 1
   }
   ```

### Step 4: Test the FastAPI OCR Service Directly
Test the Python OCR service independently of the backend using Uvicorn:
1. Open a new tab in Postman, change the method to **`POST`**, and enter the FastAPI scan URL:
   ```
   http://localhost:8001/scan
   ```
2. Navigate to the **Body** tab, select **raw** with **JSON** format, and paste a test payload containing a base64 image string:
   ```json
   {
     "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAA..."
   }
   ```
3. Click **Send** to verify the OCR response times, confidence levels, and extracted ID strings directly from FastAPI.

---

## 5. API Testing Troubleshooting & Checks

* **Error: `401 Unauthorized / Credentials Cookie Missing`**
  * *Reason*: The testing tool did not attach the JWT authentication cookie to the request.
  * *Solution*: Re-run the authentication request (`POST /api/auth/login`) in Postman to refresh and store the session cookie in your active session.

* **Error: `413 Payload Too Large / Image Encoding Failed`**
  * *Reason*: The base64 JPEG string exceeded the maximum body size limits configured in Express.
  * *Solution*: Verify that Express has high body limits configured (`server/index.js`):
    ```javascript
    app.use(express.json({ limit: '25mb' }));
    ```

* **Error: `Tedious Database Connection Timeout`**
  * *Reason*: The database was locked or had active connections blocks.
  * *Solution*: Check the active database locks in SSMS using SPID checks:
    ```sql
    EXEC sp_who2;
    ```
