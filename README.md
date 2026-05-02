# 🛡️ PROVEXA — Employee Welfare Management and Digital Acknowledgement System

[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=flat-square&logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=react)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.x-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)

---

## 1. Project Overview
**PROVEXA** is a professional web application designed for companies to manage the items they give to employees, such as uniforms, safety gear (helmets, gloves), and tools.

In many workplaces, these items are tracked on paper, which can be easily lost or damaged. PROVEXA makes this process digital and secure. It records every item given out, captures a digital signature from the employee as proof, and automatically tracks when items should be returned or replaced.

---

## 2. Main Features

### 🔐 Secure Login
Only authorized administrators can log in to manage the system. Passwords are encrypted for safety.

### 👷 Employee Management
Easily add and track employee details, including their department and job title. Each employee has a unique ID to prevent confusion.

### 📦 Asset Tracking
Organize items into categories (like "Safety Gear"). You can set rules for each item, such as how often it needs to be replaced.

### ✍️ Digital Signatures
When an employee receives an item, they sign directly on a digital pad (like a tablet or mouse). The system saves this signature as an image file, providing permanent proof of receipt.

### 📋 Bulk Issuing
Save time by assigning items to many employees at once. The system automatically calculates when each item is due for return.

### 📊 Professional Reports
Generate detailed reports in Excel or PDF format. The Excel reports are professionally styled and even include the employee's actual signature image inside the spreadsheet.

### 🔄 Replacement Requests
If an item is damaged, an employee can request a replacement. Admins can review these requests and approve or reject them with notes.

---

## 3. Key Abbreviations (Glossary)
To make things easy to understand, here are some common terms used in this project:

*   **SAP**: **System Application Process** — The standard procedure followed to issue and track items.
*   **MERN Stack**: **MongoDB, Express, React, Node.js** — The group of technologies used to build this app.
*   **API**: **Application Programming Interface** — A bridge that allows the website to talk to the database.
*   **UI**: **User Interface** — The actual screens, buttons, and menus that you interact with.
*   **DB**: **Database** — The digital storage where all employee and item records are kept.

---

## 4. Technology Stack (Simplified)

### Frontend (What the user sees)
*   **React**: The foundation used to build a smooth and interactive user interface.
*   **Vite**: A tool that makes the website load very fast during development.
*   **Tailwind CSS**: A modern way to style the website so it looks professional and clean.
*   **Lucide React**: A collection of clear and simple icons used throughout the app.

### Backend (The "Brain" behind the scenes)
*   **Node.js & Express**: The engine that handles all the logic, such as logging in and saving data.
*   **MongoDB**: A modern database that stores all records securely.
*   **ExcelJS**: A specialized tool used to create high-quality Excel files with images.

---

## 5. How the System Works (Simple Explanation)

### The Digital Signature Process
When an employee signs for an item:
1. They draw their signature on a digital pad.
2. The system converts that drawing into a real **PNG image**.
3. This image is stored safely on the server and linked to the employee's record.

### Data Security (Middleware)
Think of middleware as a **Security Guard**. Every time someone asks the system for data, the "guard" checks if they are logged in. If they aren't, they are turned away. This keeps your data safe.

---

## 6. API Testing & Database (How to see Output)

### 🧪 Using Postman (Testing the "Brain")
Postman allows you to see how the backend responds to requests without using the website.
1.  Open **Postman**.
2.  Type the address: `http://localhost:5000/api/auth/login` (or any other path).
3.  Choose the method (like **GET** to see data or **POST** to login).
4.  Click **Send** to see the result.

### 🗄️ Using MongoDB Compass (Viewing the Records)
To see exactly what is saved in the database:
1.  Open **MongoDB Compass** and click **Connect**.
2.  Open the **PROVEXA** database.
3.  Click on a "Collection" (like `employees`) to see all the data entries clearly.

---

## 7. Setup and Installation

### Prerequisites
You need to have **Node.js** and **MongoDB** installed.

### Quick Start
1.  **Backend**: Go to the `server` folder, run `npm install`, then `npm run dev`.
2.  **Frontend**: Go to the `client` folder, run `npm install`, then `npm run dev`.

---

## 8. GitHub Guide (Commands to run manually)

To save your project to GitHub, run these commands in your terminal:

```bash
# 1. Prepare all files to be saved
git add .

# 2. Save a snapshot of your project
git commit -m "Update: Complete Welfare & Acknowledgement System"

# 3. Upload everything to GitHub
git push origin main
```

---

## 9. Conclusion
**PROVEXA** simplifies employee welfare management by replacing old paper logs with a fast, secure digital system. It ensures every item is acknowledged with a real signature, making the process faster and more reliable for administrators.
