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

### 📈 Dashboard
A simple home screen showing important stats, like how many items were given out this month and how many are overdue for return.

---


## 3. Key Abbreviations (Glossary)
To make things easy to understand, here are some common terms used in this project:

*   **SAP**: **System Application Process** — The standard procedure followed to issue and track items.
*   **MERN Stack**: **MongoDB, Express, React, Node.js** — The group of technologies used to build this app.
*   **API**: **Application Programming Interface** — A bridge that allows the website to talk to the database.
*   **UI**: **User Interface** — The actual screens, buttons, and menus that you interact with.
*   **DB**: **Database** — The digital storage where all employee and item records are kept.
*   **HMR**: **Hot Module Replacement** — A technology that lets developers see changes instantly without refreshing the page.

---

## 4. How the System Works (Simple Explanation)

### The Digital Signature
Instead of signing on a piece of paper that can get lost, employees sign on a screen. 
1. The signature is turned into a **PNG image**.
2. This image is stored in a special folder on the server.
3. The system "links" this image to the employee's record so you can see it anytime.

### Data Security (Middleware)
We use a "Security Guard" called **Middleware**. It checks if a user is logged in before letting them see any sensitive information. If they aren't authorized, they are blocked.

---

## 5. API Testing & Database (How to see Output)

### 🧪 Using Postman (Testing the "Brain")
Postman allows you to see how the backend (the "brain") responds to requests.
1.  Open **Postman**.
2.  Type the address: `http://localhost:5000/api/auth/login` (or any other path).
3.  Choose the method (like **GET** to see data or **POST** to login).
4.  Click **Send** to see the result. If successful, you will see a "200 OK" message and some data.

### 🗄️ Using MongoDB Compass (Viewing the Records)
To see exactly what is saved in the database:
1.  Open **MongoDB Compass**.
2.  Click **Connect** to link to your local database.
3.  Open the **PROVEXA** database.
4.  Click on a "Collection" (like `employees`) to see all the data entries clearly.

---

## 6. Quick Setup

### Prerequisites
Make sure you have **Node.js** and **MongoDB** installed.

### Steps to Run
1.  **Backend**: Go to the `server` folder, run `npm install`, then `npm run dev`.
2.  **Frontend**: Go to the `client` folder, run `npm install`, then `npm run dev`.
3.  **Access**: Open your browser to the link shown in the frontend terminal (usually `http://localhost:5173`).

---

## 7. Conclusion
**PROVEXA** simplifies employee welfare management by replacing old paper logs with a fast, secure digital system. It ensures every item is acknowledged with a real signature, making it perfect for modern workplace management.

