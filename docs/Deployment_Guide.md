# PROVEXA — Enterprise System Deployment & Intranet Setup Guide
### Production Hosting, Windows Server Configuration, and LAN Settings

---

## 1. Document Scope & Audience

This deployment guide serves as a practical, production-level checklist for technical support teams, system administrators, and developers. It covers all necessary steps to install, configure, and host the **PROVEXA** system on local networks and Windows Servers. It details local subnet (LAN) setup, SQL Server Express database restorations, Microsoft IIS web server mapping, PM2 backend configuration, and mobile/tablet camera permissions bypass protocols.

---

## 2. Infrastructure Prerequisites

Before deploying the application, ensure the host laptop or Windows Server meets the following base criteria:

### Hardware Requirements
* **CPU**: Dual-Core 2.0 GHz or higher (Quad-Core recommended to handle PyTorch machine learning tasks).
* **RAM**: 8 GB minimum (16 GB recommended).
* **Disk**: 5 GB of free hard drive space (for database storage, PyTorch weights, and uploaded signature image files).

### Software Requirements
* **Operating System**: Windows 10, Windows 11, or Windows Server (2016 or higher).
* **Node.js**: Version 20.x or higher (includes npm package manager).
* **Python**: Version 3.10.x or 3.11.x (Check **"Add Python to PATH"** during installation).
* **Database**: Microsoft SQL Server Express (2019 or higher) and SQL Server Management Studio (SSMS).
* **Process Manager**: PM2 (installed globally via npm).
* **Web Server (Optional for Production)**: Internet Information Services (IIS) with **`iisnode`** and **URL Rewrite** extensions.

---

## 3. Database Server Setup (SQL Server Express)

PROVEXA uses Microsoft SQL Server Express as its database engine. Follow these steps to configure the database for production:

### I. Enable TCP/IP Protocol
By default, SQL Server Express disables remote connection endpoints. To enable connections:
1. Open the **SQL Server Configuration Manager** as Administrator.
2. Expand **SQL Server Network Configuration** and select **Protocols for SQLEXPRESS** (or your target SQL instance).
3. Right-click **TCP/IP** and click **Enable**.
4. Right-click **TCP/IP** and select **Properties**. Go to the **IP Addresses** tab.
5. Scroll down to the **IPAll** section and set **TCP Port** to `1433`.
6. Click **Apply** and click **OK**.
7. Go to **SQL Server Services**, right-click **SQL Server (SQLEXPRESS)**, and click **Restart**.

```
  SQL Configuration Manager ──► Protocols ──► TCP/IP (Enable & Port 1433) ──► Restart SQL Service
```

### II. Enable SQL Authentication Mode
1. Launch **SQL Server Management Studio (SSMS)** and log in using Windows Authentication.
2. Right-click the server node in Object Explorer and select **Properties**.
3. Navigate to the **Security** tab.
4. Under **Server authentication**, select **SQL Server and Windows Authentication mode** (Mixed Mode).
5. Click **OK** and restart the SQL Server service.

### III. Configure SQL User Credentials
1. In SSMS, expand **Security** -> **Logins**.
2. Right-click **Logins** and select **New Login...**.
3. Enter **Login name**: `provexa_user`.
4. Select **SQL Server authentication** and enter **Password**: `Provexa@123`.
5. Uncheck **Enforce password policy** (recommended for local test setups).
6. Under **Server Roles**, verify that **public** and **dbcreator** roles are checked.
7. Click **OK** to save the user login.

---

## 4. SQL Database Backup & Restore

To migrate an active database from an existing machine or to set up the system on another laptop:

### I. Creating the Database Backup (`.bak` file)
On the development machine, run the following script in SSMS to generate a complete backup file:
```sql
-- Ensure target directory exists on disk before running
BACKUP DATABASE ProvexaDB_New
TO DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH FORMAT,
     MEDIANAME = 'SQLServerBackups',
     NAME = 'Full Backup of ProvexaDB_New';
GO
```

### II. Restoring the Database on the Destination Machine
1. Copy the `ProvexaDB_Backup.bak` file to a folder on the new laptop (e.g. `C:\Backups\ProvexaDB_Backup.bak`).
2. Open SSMS on the destination machine, open a **New Query** window, and execute the restore script:
```sql
USE master;
-- Close active connections to prevent restoration conflicts
ALTER DATABASE ProvexaDB_New SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

-- Restore database from backup file
RESTORE DATABASE ProvexaDB_New
FROM DISK = 'C:\Backups\ProvexaDB_Backup.bak'
WITH REPLACE,
     RECOVERY;

-- Return database to multi-user mode
ALTER DATABASE ProvexaDB_New SET MULTI_USER;
GO
```
3. Map permissions to the local SQL user:
   * In Object Explorer, navigate to the restored **`ProvexaDB_New`** database, expand **Security** -> **Users**.
   * Add `provexa_user`, binding it to the restored schema, and assign **db_owner** permissions to enable dynamic migrations.

---

## 5. Local Area Network (LAN) & Wi-Fi Access Setup

To run PROVEXA across a local area network, allowing tablets and smartphones to connect directly to the system:

### I. Connect Host and Client Devices
Ensure the host laptop and the mobile or tablet devices are connected to the **same Wi-Fi network**.

### II. Find the Host Laptop's Local IP Address
1. Open a command prompt or terminal on the host laptop.
2. Run the network configuration command:
   ```cmd
   ipconfig
   ```
3. Locate the active **IPv4 Address** under your Wi-Fi or Ethernet adapter (e.g., `192.168.1.15`).

### III. Configure Vite Host Routing
Open `client/package.json` on the host laptop and configure the Vite server to listen on the local network by adding the `--host` flag to the start command:
```json
"scripts": {
  "dev": "vite --host"
}
```

### IV. Accessing the App from Tablets/Mobiles
Open the web browser on the mobile or tablet device and enter the host laptop's IP address:
* **Frontend UI Web Access**: `http://192.168.1.15:5173`
* **Backend API URL**: `http://192.168.1.15:5000`

---

## 6. Mobile Camera Permission Setup

Modern browsers block camera access on unsecured connections to protect user privacy. Secure origins are restricted to `localhost` and `https://` websites. To access the camera on mobile devices over local HTTP test connections, bypass these restrictions:

### Android Devices (Chrome)
1. Launch **Chrome** on the Android device.
2. Enter the following URL in the address bar: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Tap **Disabled** and change the value to **Enabled**.
4. In the text box below, enter the host laptop's local IP address and port:
   ```
   http://192.168.1.15:5173
   ```
5. Tap **Relaunch** at the bottom of the screen to apply the changes. The browser will now treat the local network address as a secure origin, enabling the camera during scans.

### iOS Devices (Safari on iPhone / iPad)
1. Open the **Settings** app on the iOS device, scroll down, and select **Safari**.
2. Scroll to the bottom and select **Advanced** -> **Experimental Features** (or **Feature Flags** in iOS 17+).
3. Search for and enable **Media Recorder** and **getUserMedia** permissions.
4. When you open the application, tap **Allow** on the camera access pop-up dialog.

---

## 7. Windows Server Production Deployment (IIS + PM2)

For formal production deployments on Windows Server, configure a robust reverse-proxy gateway:

```
  Static React (IIS) ──► HTTP Web Traffic (Port 80/443) ──► Proxy to Express Backend (Port 5000)
```

### I. Hosting the React Frontend in IIS
1. Run `npm run build` in the `client/` folder. This generates a pre-compiled, optimized static directory inside `client/dist/`.
2. Open **IIS Manager**, right-click **Sites**, and click **Add Website...**.
3. Enter **Site name**: `ProvexaFrontend`.
4. Set **Physical path** to the compiled `client/dist/` directory on disk.
5. Set **Binding** to HTTP Port `80` (or Port `443` for secure HTTPS setups).
6. Click **OK** to start the website.

### II. Hosting the Backend Node.js Server via PM2
PM2 runs the Express API as a background service, ensuring automatic restarts if the process crashes:
1. Open a command prompt and install PM2 globally:
   ```bash
   npm install pm2 -g
   ```
2. Navigate to the `server/` directory and start the application daemon:
   ```bash
   pm2 start index.js --name "provexa-backend" --max-memory-restart 500M
   ```
3. To configure the process to start automatically on system reboots, save the current configuration list:
   ```bash
   pm2 save
   ```

### III. Configuring IIS Reverse Proxy for API Routes
To route API requests from Port 80 to the running backend service on Port 5000:
1. Install **URL Rewrite** and **Application Request Routing (ARR)** extensions in IIS.
2. In IIS Manager, select the server node, double-click **Application Request Routing Cache**, go to **Server Settings**, and check **Enable proxy**.
3. Open the `web.config` file inside your compiled React `client/dist/` directory and configure the rewrite rules:
```xml
<configuration>
  <system.webServer>
    <rewrite>
      <rules>
        <!-- Proxy API requests to Node backend on Port 5000 -->
        <rule name="ProvexaAPI" stopProcessing="true">
          <match url="api/(.*)" />
          <action type="Rewrite" url="http://127.0.0.1:5000/api/{R:1}" />
        </rule>
        <!-- Enforce React Single Page routing -->
        <rule name="ReactRouter" stopProcessing="true">
          <match url=".*" />
          <conditions logicalGrouping="MatchAll">
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="true" />
            <add input="{REQUEST_FILENAME}" matchType="IsDirectory" negate="true" />
          </conditions>
          <action type="Rewrite" url="index.html" />
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

---

## 8. Deployment Checklist & Terminal Sequence

To configure the application on a new laptop from scratch:

```
  1. Setup Software ──► 2. Restore DB ──► 3. Config .env ──► 4. Run Services (Terminals 1, 2, 3)
```

1. **Prerequisites**: Confirm that Node.js, Python, and SQL Server are installed.
2. **Database**: Restore `ProvexaDB_New` from the `.bak` backup file and map permissions.
3. **Environment Configurations**: Create `.env` files inside `server/` and `client/` folders.
4. **Dependencies**:
   ```bash
   # Build Server
   cd server && npm install
   
   # Build Client
   cd ../client && npm install
   
   # Setup Python OCR environment
   cd ../ocr_service
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   ```
5. **Launch Services**: Start the services in separate terminals:
   * **Terminal 1 (OCR)**: `venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8001`
   * **Terminal 2 (API)**: `npm run dev` in `server/` folder.
   * **Terminal 3 (Client)**: `npm run dev` in `client/` folder.
