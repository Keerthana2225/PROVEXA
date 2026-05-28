# PROVEXA — Step-by-Step Fresh System Setup Guide
### How to Deploy the GitHub Project on a New Laptop from Scratch

This guide is designed for deploying the **PROVEXA** repository on a new machine that does **not** have Node.js, Python, SQL Server, or Git pre-installed. Follow these steps in order to download, configure, and launch all the frontend, backend, database, and OCR components.

---

## Part 1: Download & Install Software Prerequisites

### Step 1: Install Git (Version Control)
To pull your code files directly from your GitHub repository, you need Git:
1. Download the installer from the official page: [https://git-scm.com/download/win](https://git-scm.com/download/win)
2. Run the downloaded `.exe` installer.
3. Click **Next** on all default options, and click **Install**.
4. Once finished, verify by opening a new command prompt (CMD) and typing:
   ```bash
   git --version
   ```

### Step 2: Install Node.js (Frontend & Backend Runtime)
Node.js runs your React client and Express backend services:
1. Download Node.js from the official site: [https://nodejs.org/en](https://nodejs.org/en) (Select the **LTS (Long Term Support)** version).
2. Run the downloaded installer.
3. Accept the license agreement, leave all settings at default, and click **Install**.
4. Once finished, verify the installation in command prompt:
   ```bash
   node -v
   npm -v
   ```

### Step 3: Install Python (OCR Machine Learning Runtime)
Python executes your OpenCV and EasyOCR text recognition service:
1. Download Python v3.10 or v3.11 from: [https://www.python.org/downloads/windows/](https://www.python.org/downloads/windows/)
   > [!IMPORTANT]
   > Do **NOT** install Python 3.12 or higher yet, as some machine learning libraries (like PyTorch and EasyOCR) require v3.10 or v3.11 to compile correctly on Windows.
2. Run the installer.
3. **CRITICAL STEP**: Before clicking Install, check the box at the bottom that says: **"Add Python to PATH"** (or **"Add python.exe to PATH"**). If you miss this, Windows will not recognize python commands.
4. Click **Install Now**.
5. Once finished, verify by opening command prompt:
   ```bash
   python --version
   ```

### Step 4: Install SQL Server Express & SSMS (Relational Database)
1. Download the **SQL Server 2022 Express Edition** installer: [https://www.microsoft.com/en-us/sql-server/sql-server-downloads](https://www.microsoft.com/en-us/sql-server/sql-server-downloads)
2. Run the installer and select the **Basic** installation type.
3. Accept the defaults and click **Install**.
4. When the installation completes, the installer will display a button that says: **"Install SSMS"** (SQL Server Management Studio). Click it to download SSMS, or download it manually from: [https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
5. Run the downloaded SSMS setup file, install it, and restart your computer when prompted.

---

## Part 2: Pull the Code & Copy the Database Backup

### Step 1: Clone the GitHub Repository
1. Open a command prompt (CMD) and navigate to the folder where you want to store the project (e.g. your local `C:\` or `D:\` drive).
2. Clone the repository using Git:
   ```bash
   git clone https://github.com/Keerthana2225/PROVEXA.git
   cd PROVEXA
   ```

### Step 2: Transfer and Restore your Database Backup
To migrate the database data, you need to create a backup file on the old laptop and restore it on the new machine:

#### 1. On the OLD Laptop (Create `.bak` file):
Open **SQL Server Management Studio (SSMS)**, connect to the database engine, click **New Query**, and execute:
```sql
BACKUP DATABASE ProvexaDB_New
TO DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH FORMAT,
     NAME = 'Full Backup of ProvexaDB_New';
GO
```
*Locate the generated `ProvexaDB_Backup.bak` file inside `C:\Backups\`, copy it to a USB drive, and transfer it to the NEW laptop.*

#### 2. On the NEW Laptop (Restore `.bak` file):
1. Place the backup file in a target folder (e.g., `C:\Backups\ProvexaDB_Backup.bak`).
2. Open **SSMS** on the new laptop, click **Connect**, and log in using Windows Authentication.
3. Click the **New Query** button at the top and execute the restore commands:
```sql
USE master;
-- Terminate active connection blocks to start restoration
ALTER DATABASE ProvexaDB_New SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

-- Restore database using the backup file path
RESTORE DATABASE ProvexaDB_New
FROM DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH REPLACE,
     RECOVERY;

-- Return database to multi-user mode
ALTER DATABASE ProvexaDB_New SET MULTI_USER;
GO
```

---

## Part 3: Configure SQL Server Security & Users

On the new laptop, SQL Server must be configured to accept connection queries from the Node.js Express server:

### I. Enable TCP/IP Protocols
1. Open the **SQL Server Configuration Manager** search bar on the new laptop.
2. Click **SQL Server Network Configuration** -> select **Protocols for SQLEXPRESS**.
3. Right-click **TCP/IP** and click **Enable**.
4. Right-click **TCP/IP** and select **Properties**. Go to the **IP Addresses** tab.
5. Scroll down to the bottom section (**IPAll**).
6. Set the **TCP Port** to `1433`.
7. Click **Apply** and click **OK**.
8. Go to **SQL Server Services** on the left menu, right-click **SQL Server (SQLEXPRESS)**, and click **Restart**.

### II. Enable Mixed Authentication Mode
1. Open **SSMS**, right-click the top-level database server connection in Object Explorer, and click **Properties**.
2. Select the **Security** tab.
3. Under **Server authentication**, select **SQL Server and Windows Authentication mode**.
4. Click **OK**.

### III. Register Database Login Credentials
1. In SSMS Object Explorer, expand **Security** -> right-click **Logins** -> select **New Login...**.
2. Enter **Login name**: `provexa_user`.
3. Select **SQL Server authentication** and enter **Password**: `Provexa@123`.
4. Uncheck the box for **Enforce password policy**.
5. Go to the **User Mapping** tab on the left.
6. Check the box next to **`ProvexaDB_New`** in the top list.
7. In the bottom role membership list, check **db_owner** and **public**.
8. Click **OK**.
9. Right-click the database server node in Object Explorer and select **Restart** to apply authentication permissions.

---

## Part 4: Configure Project Environment Files

Configure the `.env` variable files in both project folders before launching:

### I. Configure Backend Variables (`server/.env`)
1. In your project, navigate to the `server/` directory.
2. Open `.env` (or create a new file named `.env`) and input the database configurations:
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

### II. Configure Frontend Variables (`client/.env`)
1. Navigate to the `client/` directory.
2. Open `.env` (or create a new file named `.env`) and input the backend URL point:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

---

## Part 5: Install Project Dependencies

To install all the required Node and Python packages, open a terminal window in the root `PROVEXA/` folder and run the installation scripts:

### I. Install Node.js Packages (Backend & Frontend)
```bash
# Navigate to the backend directory and install dependencies
cd server
npm install

# Navigate to the frontend directory and install dependencies
cd ../client
npm install
```

### II. Configure the Python Virtual Environment & OCR Libraries
```bash
# Navigate to the OCR microservice directory
cd ../ocr_service

# Create a clean virtual environment
python -m venv venv

# Activate the virtual environment:
# If you are using Windows CMD (Command Prompt):
venv\Scripts\activate.bat
# If you are using Windows PowerShell:
venv\Scripts\Activate.ps1

# Install requirements
pip install -r requirements.txt
```
*(Note: Installing the requirements downloads PyTorch and the EasyOCR English language model weights on first run, which may take a few minutes).*

---

## Part 6: Running the Entire System

To run the application, open three separate terminal windows and start the services in order:

### Terminal 1: Python OCR Service
Start the AI microservice on Port 8001:
```bash
cd ocr_service
venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001
```

### Terminal 2: Express Backend Server
Start the API gateway on Port 5000:
```bash
cd server
npm run dev
```

### Terminal 3: Vite Frontend Client
Start the React development server:
```bash
cd client
npm run dev
```

### Quick Launcher
Alternatively, double-click the **`start_provexa.bat`** file located in the root project directory to automatically check ports and start all three terminal services. Open your browser and navigate to `http://localhost:5173` to access the PROVEXA console.
