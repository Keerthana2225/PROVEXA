## 1. Project Overview & Scope
* PROVEXA is an employee asset management and handover verification system. It tracks employees, item master data, item issue records, renewal and return cycles, additional uniform/item requests, replacement exchanges, payroll-facing additional cost reports, and secure handover proof through OCR ID scanning and digital signatures.
* The project is a React/Vite single page application backed by a Node/Express API and database models for employees, items, issue records, replacement requests, verification logs, allocation limits, and official price lists. OCR is handled by a separate Python FastAPI service that receives image frames, extracts employee codes, and returns verification status.
* The active React routes are `/login`, `/`, `/employees`, `/employees/:id/profile`, `/items`, `/issues`, `/item-renewal`, `/replacements`, and `/reports`. A `Verification.jsx` page exists in source but is not registered in the current router.

## 2. Core Navigation & Global Elements
* The protected application shell uses a left sidebar, top header, main content area, and global toast notification container.
* Sidebar brand area: blue lightning icon, `Provexa` wordmark, collapsible to icon-only mode.
* Sidebar navigation:
  * Dashboard: `/`
  * Employees: `/employees`
  * Items Master: `/items`
  * Issue Management: `/issues`
  * Item Renewal & Return: `/item-renewal`
  * Replacements: `/replacements`
  * Reports: `/reports`
* Sidebar footer action:
  * `Sign Out` posts to `/api/auth/logout`, clears React Query cache, and navigates to `/login`.
* Global top header:
  * Sidebar collapse/expand button.
  * Dynamic page title based on current route.
  * Static admin identity block: `Store/HR Admin`, `System Admin`, circular `A` avatar.
* Authentication behavior:
  * On app load, `/api/auth/me` checks current session.
  * Protected routes redirect to `/login` when no authenticated admin is returned.
  * API interceptor dispatches a global `unauthorized` browser event on 401 responses and redirects to `/login`.
* Global feedback:
  * Toast notifications show success/error states for create, update, delete, export, verification, approval, rejection, return, renewal, and handover actions.

## 3. Detailed Screen-by-Screen Inventory
### Login
* **Purpose:** Authenticate an admin before entering the protected application.
* **Main UI Components & Layout:** Centered login card on full-screen gradient background; Provexa icon block; app title and subtitle; error alert area; stacked login form.
* **Data Fields & Inputs:** Email Address input, Password input. Defaults in source are `admin@provexa.com` and `admin123`.
* **Current Workflow/Actions:** `Sign In` posts `{ email, password }` to `/api/auth/login`; success invalidates the auth query and enters the app; failure displays the API error message or `Login failed`; button text changes to `Authenticating...` while pending.

### Dashboard
* **Purpose:** Provide executive snapshot metrics, distribution trends, and fast entry points into issue/replacement workflows.
* **Main UI Components & Layout:** Two metric rows at top; main grid with a two-column bar chart card and a one-column quick actions card; embedded issue and replacement modals.
* **Data Fields & Inputs:** Metrics from `/api/dashboard/stats`: Active Employees, Issued This Month, Pending Replacements, Upcoming Renewals, Items Requiring Attention, Additional Allocation Requests, Pending Additional Cost, Total Additional Cost. Chart from `/api/dashboard/chart-data`: month `name` and `issues` count.
* **Current Workflow/Actions:** `Issue Item` opens Bulk Issue Distribution modal; `New Replacement` opens New Item Request modal; `View Renewals` navigates to `/item-renewal`; `Manage Employees` navigates to `/employees`.

### Employees
* **Purpose:** Manage employee master records and open a detailed employee asset profile.
* **Main UI Components & Layout:** Gradient header banner with page explanation and Add Employee button; search bar; employee table; pagination footer; EmployeeForm modal.
* **Data Fields & Inputs:** Search input filters by name, employee code, or department; table columns include Employee Details, Department & Role, Status, Quick Actions. Displayed fields include name, emp_code, employee_type, department, designation, status.
* **Current Workflow/Actions:** Fetches `/api/employees?page={page}&search={search}&limit=10`; `Add Employee` opens blank EmployeeForm; pencil opens EmployeeForm in edit mode; `Profile` navigates to `/employees/:id/profile`; Previous/Next changes table page.

### Employee Form Modal
* **Purpose:** Create or update an employee master record.
* **Main UI Components & Layout:** Modal form with two-column top row, selects, segmented radio choices, size inputs, optional edit-only status controls.
* **Data Fields & Inputs:** Employee Code, Full Name, Department, Designation, Employment Type (`Permanent`, `Intern`), Gender (`Male`, `Female`), Uniform Sizes (`shirt`, `pant`, `shoe`), edit-only Status (`active`, `inactive`).
* **Current Workflow/Actions:** Add mode posts to `/api/employees`; edit mode puts to `/api/employees/:id`; employee code is disabled during edit; success invalidates `employees` and `dashboardStats`; errors display inline.

### Employee Asset Profile
* **Purpose:** Show a single employee's full asset, quota, verification, additional cost, and activity context.
* **Main UI Components & Layout:** Dark employee header with back button, avatar, identity badges, size badges, Issue Item button, and four stat tiles; tab navigation; optional pending signature banner; content panels.
* **Data Fields & Inputs:** Loads `/api/employees/:id/asset-profile`. Header fields include employee name, emp_code, department, designation, status, employee_type, gender, sizes. Stats include Items Currently Held, Pending Signatures, Additional Requests, Total Additional Cost.
* **Current Workflow/Actions:** Back button returns to `/employees`; `Issue Item` opens IssueForm preloaded with the employee; pending acknowledgement banner opens UnifiedVerificationModal for all pending employee items.

### Employee Asset Profile - Overview Tab
* **Purpose:** Summarize employee identity, standard free allocation status, and latest activity.
* **Main UI Components & Layout:** Left column with Employee Details and Free Uniform Quota Status cards; right column with Recent Activity.
* **Data Fields & Inputs:** Employee details: Department, Designation, Joined, Employee Type, Status, Employee Code, Recorded Sizes. Allocation summary: item type, issued, allowed, remaining, progress bar, Available/Limit Reached/Exceeded badge. Recent timeline: event type, title, subtitle, date/time.
* **Current Workflow/Actions:** Read-only tab; quota status visually warns when allocations exceed limits.

### Employee Asset Profile - Current Holdings Tab
* **Purpose:** List all assets currently with the employee, including standard issues and additional holdings.
* **Main UI Components & Layout:** Grid of item cards.
* **Data Fields & Inputs:** Item name, category, size, source badge (`Standard` or `Additional`), quantity, next due date, verification state (`Verified` or `Pending`).
* **Current Workflow/Actions:** Read-only inventory view.

### Employee Asset Profile - Additional Costs Tab
* **Purpose:** Show payroll-relevant additional item costs for one employee.
* **Main UI Components & Layout:** Cost summary hero, optional cost-by-reason progress breakdown, individual cost record list.
* **Data Fields & Inputs:** Total Additional Cost, number of additional requests, reason breakdown amount and percentage, item name, requested_date, reason, quantity, total_cost, payment_status.
* **Current Workflow/Actions:** Read-only financial audit view.

### Employee Asset Profile - Activity Log Tab
* **Purpose:** Show full chronological employee asset activity.
* **Main UI Components & Layout:** Vertical timeline.
* **Data Fields & Inputs:** Event type, title, subtitle/notes, date, time.
* **Current Workflow/Actions:** Read-only audit view.

### Items Master
* **Purpose:** Manage item catalog and distribution schedule rules.
* **Main UI Components & Layout:** Category filter buttons; New Item button; responsive card grid; delete confirmation modal; ItemForm modal.
* **Data Fields & Inputs:** Category filter from `/api/items/categories`; item cards from `/api/items` or `/api/items?category_id=...`; each item displays category, name, due rule (`fixed_date` or `frequency_days`), description.
* **Current Workflow/Actions:** `All Items` clears category filter; category buttons filter list; `New Item` opens ItemForm; `Edit` opens ItemForm with existing data; `Delete` opens confirmation; `Delete Permanently` calls DELETE `/api/items/:id` and shows toast.

### Item Form Modal
* **Purpose:** Create or edit item master records and optionally add a new category.
* **Main UI Components & Layout:** Modal with item identity, category selection/addition, distribution schedule, description, submit button.
* **Data Fields & Inputs:** Item Name, Category select, New Category Name, Distribution Schedule radio (`Frequency (Days)` or `Fixed Date`), frequency presets (`1`, `30`, `90`, `180`, `365` days), custom frequency_days, fixed_date, description.
* **Current Workflow/Actions:** Add mode posts to `/api/items`; edit mode puts to `/api/items/:id`; validation requires category/new category and either frequency_days or fixed_date; success invalidates `items` and `categories`.

### Issue Management
* **Purpose:** Manage active issue records, pending acknowledgements, secure handover verification, and issue history/archive resets.
* **Main UI Components & Layout:** Toolbar with search, active/history toggle, reset controls, Identify & Issue and Bulk Issue actions; status filter chips; optional selection bar; optional history banner; sticky-header issue table; multiple modals.
* **Data Fields & Inputs:** Search input; View Mode (`Active Issues`, `Issue History`); status filters (`All`, `Renewal Due`, `Pending Signature`, `Acknowledged`, `Upcoming Renewal`); selection checkboxes in reset mode. Table fields: Employee Details, Item Issued, Qty, Issue Date, Due date, Status badges, Actions.
* **Current Workflow/Actions:** Fetches `/api/issues` with `lifecycle_status=Active` or `Returned` and optional status filter. `Identify & Issue` opens EmployeeIdentificationModal. `Bulk Issue` opens IssueForm. `Reset Issues` toggles selection mode. `Archive Selected` or `Reset All Active` opens archive confirmation and calls PUT `/api/issues/archive-reset`. `Verify` opens UnifiedVerificationModal. Proof icon opens Handover Verification Proof modal.

### Issue Proof Modal
* **Purpose:** Display verified handover evidence for an acknowledged issue record.
* **Main UI Components & Layout:** Modal header badge, employee identity, details grid, evidence area, optional notes, close button.
* **Data Fields & Inputs:** Employee name/code/department, item name, quantity, item condition, verification_method, acknowledgement_time, signature image from `signature_path`, OCR details including scanned code, scanned holder, confidence, device_info, notes.
* **Current Workflow/Actions:** `Close Proof` dismisses modal.

### Issue Archive Confirmation Modal
* **Purpose:** Archive active issue records without deleting them.
* **Main UI Components & Layout:** Warning block, radio scope selector, cancel/confirm buttons.
* **Data Fields & Inputs:** Scope radio: `All active issues` or `Selected records`; selected record count.
* **Current Workflow/Actions:** `Confirm Archive` calls PUT `/api/issues/archive-reset` with `{ scope: "all" }` or `{ scope: "selected", issue_ids }`; success invalidates issues, dashboard stats, due tracking and resets selection state.

### Bulk Issue Distribution Modal
* **Purpose:** Create one or many issue records across selected employees and selected items.
* **Main UI Components & Layout:** Employee multi-select, item multi-select, selected item quantity review, issue date, workflow note, duplicate warning override state.
* **Data Fields & Inputs:** Employee search, selected employee_ids, select all active employees, item search, selected item_ids, per-item quantity, issued_date, notes in form state, override flag. Duplicate checks may display active allocation warnings.
* **Current Workflow/Actions:** Posts to `/api/issues` with employee_ids and item payloads; records are created as `Pending Acknowledgement`; duplicate active issue blocks submission unless `Yes, Proceed` sends `override: true`; success invalidates issues, dashboard stats, due tracking, and employee profiles.

### Employee Identification Modal
* **Purpose:** Identify an employee before issuing from their profile, either via OCR or manual search.
* **Main UI Components & Layout:** Modal with OCR/Search segmented control; OCR scanner panel or manual employee list; preview mode with employee summary.
* **Data Fields & Inputs:** OCR camera input; manual search by name, ID, or department; preview metrics: Active Allocations, Pending Deductions.
* **Current Workflow/Actions:** OCR verified or manual selection loads `/api/employees/:id/asset-profile`; preview `Continue to Profile` navigates to `/employees/:id/profile`; `Rescan / Search` returns to identification step.

### Unified Identity Verification Modal
* **Purpose:** Acknowledge issued items through OCR, digital signature, or both.
* **Main UI Components & Layout:** Step-based modal: method selection, OCR scanner, signature canvas, success state, failed state.
* **Data Fields & Inputs:** Method choice (`AI ID Scan`, `Signature`, `Dual Mode`), OCR image frame/manual code via scanner, signature canvas, employee identity context, pending item count.
* **Current Workflow/Actions:** For a single issue calls PUT `/api/issues/acknowledge/:id`; for all employee pending records calls PUT `/api/issues/acknowledge/employee/:employeeId`; verification_method is `OCR Scan`, `Signature`, or `OCR + Signature`; OCR result is compared to expected employee code; success invalidates issues, dashboard stats, employee profile, due tracking, and lifecycle queries.

### OCR Scanner Panel
* **Purpose:** Reusable camera and manual employee ID verification component.
* **Main UI Components & Layout:** 16:9 camera viewport with ID card guide overlay, tap-to-focus ring, processing overlay, verified/failed result overlay, action buttons, manual fallback after failure.
* **Data Fields & Inputs:** Live video stream, captured JPEG frame, manual numeric employee code, device_info/user agent, OCR raw text on failure.
* **Current Workflow/Actions:** `Start Camera` requests media permissions; `Capture Employee ID` posts `/api/verification/ocr-scan`; `Retake Image` resets capture; `Stop Camera` stops tracks; failed OCR exposes manual ID field and `Verify` button.

### Item Renewal & Return
* **Purpose:** Manage lifecycle actions for active assets, upcoming renewals, returns, and historical archives.
* **Main UI Components & Layout:** Header with Active Assets and Renewal Due metrics; tab control; data table; renewal, return, and audit log modals.
* **Data Fields & Inputs:** Tabs: Active Inventory, Renewal Action Center, Past Archives. Table fields: Asset Holder, Item Details, Condition, Next Renewal, Closing Type, Processed Date, Actions. Upcoming view separates Requires Immediate Attention and Expiring Soon.
* **Current Workflow/Actions:** Active tab fetches `/api/issues?lifecycle_status=Active`; upcoming tab fetches `/api/issues/upcoming`; history fetches returned and renewed records. Timeline icon opens asset audit log. `Renew` opens renewal modal. `Return` opens return modal.

### Asset Renewal Process Modal
* **Purpose:** Close an existing issue cycle as renewed and create a fresh pending issue record.
* **Main UI Components & Layout:** Impact warning block, optional notes textarea, complete button.
* **Data Fields & Inputs:** Internal Notes; item_condition state defaults to `Good` in code but is not visibly edited in the current modal.
* **Current Workflow/Actions:** Submit posts `/api/issues/:id/renew` with notes and item_condition; backend archives old record as `Renewed`, creates new active record with `Pending Acknowledgement`, recalculates next_due_date, decrements stock, and invalidates issues/upcoming/dashboard.

### Asset Return Processing Modal
* **Purpose:** Mark an issued asset as returned and archive it.
* **Main UI Components & Layout:** Item/employee context block, returned condition select, remarks textarea, process button.
* **Data Fields & Inputs:** Returned Condition (`Good Condition`, `Requires Maintenance`, `Severely Damaged`), Return Remarks.
* **Current Workflow/Actions:** Submit posts `/api/issues/:id/return`; backend sets lifecycle_status `Returned`, archived true, archive_reason `Returned`, return_date, returned_condition, and increments stock for good condition.

### Comprehensive Asset Audit Log Modal
* **Purpose:** Show issue/verification/return/renewal history for an asset.
* **Main UI Components & Layout:** Header with item and holder; alternating vertical timeline cards.
* **Data Fields & Inputs:** Timeline event status, date/time, notes.
* **Current Workflow/Actions:** Read-only modal; close through standard modal control.

### Replacements
* **Purpose:** Manage additional item requests, replacement/exchange requests, approval decisions, handover verification, allocation limits, and cost tracking.
* **Main UI Components & Layout:** Header with Allocation Settings and New Request buttons; collapsible allocation settings drawer; stat cards; tab/search row; request table; approval/rejection/proof/handover/request modals.
* **Data Fields & Inputs:** Summary cards include Additional Cost, Verified Handovers, Awaiting Handover. Tabs: New Requests (`pending`), Handover Queue (`approved`), Audit Log (`completed,rejected`). Search filters by employee name, employee code, or item name. Table includes Status, Asset Holder, Replacement Item, Type/Reason, Cost/Qty/Size, Return Status/Verification, Actions.
* **Current Workflow/Actions:** Fetches `/api/replacements?status={tabStatus}` and `/api/replacements/summary`; `Allocation Settings` toggles drawer; `New Request` opens ReplacementForm; `Approve` opens approval modal; reject icon opens rejection modal; `Handover` opens ReplacementHandoverModal; completed proof icon opens proof modal.

### Allocation Settings Drawer
* **Purpose:** Configure default standard uniform quantities.
* **Main UI Components & Layout:** Drawer with permanent employee limits and intern/temporary limits grouped by item type.
* **Data Fields & Inputs:** Number inputs for Pant, Shirt, T-Shirt under Permanent Employees and Intern / Temporary Employees.
* **Current Workflow/Actions:** Loads `/api/replacements/configs`; `Save Limits` posts `/api/replacements/configs`; success invalidates allocation configs and replacements.

### New Item Request Modal
* **Purpose:** Submit additional item requests or replacement/exchange requests.
* **Main UI Components & Layout:** Step-based modal: request type, employee search, item selection, selected item cart, transaction reason, sticky submit area.
* **Data Fields & Inputs:** Request Type (`Additional`, `Replacement`), employee search/selection, gender-derived rate badge, item search, quick-add panel, selected item cart. Cart fields: quantity, size, previous_issue_id for replacements, return_status for replacement old items, calculated line cost and total cost for additional items. Reason options for Additional: `Additional Request`, `Lost Item`, `Other`; Replacement: `Damage`, `Size Change`, `Exchange`, `Other`; notes required when reason is Other.
* **Current Workflow/Actions:** Additional item list is restricted to official price list items valid for selected gender; Replacement item list shows all items. Quick-add posts `/api/items`, then PUT `/api/replacements/prices`, then selects the new item. Submit posts one `/api/replacements` request per cart item; success invalidates replacements, dashboard stats, and employee profiles.

### Replacement Approval/Rejection Modal
* **Purpose:** Approve request costs or reject requests with remarks.
* **Main UI Components & Layout:** Request context block, conditional cost editor, calculated total cost card, remarks textarea, submit button.
* **Data Fields & Inputs:** Manual Item Cost, calculated Total Additional Cost, Admin Remarks.
* **Current Workflow/Actions:** Approval calls PUT `/api/replacements/:id/approve` with notes and unit_cost; rejection calls PUT `/api/replacements/:id/reject`; success invalidates replacements and summary where applicable.

### Secure Asset Exchange / Replacement Handover Modal
* **Purpose:** Complete approved additional/replacement handover with old item collection and identity verification.
* **Main UI Components & Layout:** Step-based modal with request header, optional old asset collection block, verification method selection, OCR scanner, signature canvas, handover notes, success state.
* **Data Fields & Inputs:** Item collected checkbox for replacements requiring return, verification method (`OCR ID Scan`, `Signature`, `Both`), OCR frame/manual code, signature canvas, final handover notes.
* **Current Workflow/Actions:** For replacements with return required, verification buttons are disabled until old item collection is checked. OCR result must match the request employee code. Signature or OCR submit calls PUT `/api/replacements/:id/acknowledge`; backend marks status `Completed`, lifecycle_status `Completed`, acknowledged true, item_collected true, payment_status `Paid` when total_cost > 0, return_status `Returned` when pending, and decrements stock.

### Replacement Proof Modal
* **Purpose:** Display completed replacement/additional handover proof.
* **Main UI Components & Layout:** Same proof structure as issue proof: header badge, identity, details grid, evidence, notes, close button.
* **Data Fields & Inputs:** Employee name/code/department, item name, quantity, size, handover method, resolved_date, signature image, OCR scanned code/holder/confidence/device_info, notes.
* **Current Workflow/Actions:** `Close Proof` dismisses modal.

### Reports
* **Purpose:** Configure filters and export Excel reports for issues, replacements, and additional uniform/item costs.
* **Main UI Components & Layout:** Header with Reset Filters; Global Filters card; two report cards in a two-column grid; enterprise export note.
* **Data Fields & Inputs:** Global filters: Department (`Production`, `Maintenance`, `Quality`, `Stores`), Employee ID, Start Date, End Date. General report filters: Asset Category, Verification Method (`all`, `OCR Scan`, `Signature`, `Signature + OCR`), Acknowledgement Status. Replacement report filters: Status (`Pending`, `Approved`, `Completed`, `Rejected`), internal itemType state defaults to `all`.
* **Current Workflow/Actions:** `Reset Filters` clears all filters. `Export Issue Report` calls `/api/reports/export`. `Export Additional Items Report` calls `/api/reports/replacements/additional-deductions`. `Export Replacements Report` calls `/api/reports/replacements/history`. Exports use blob download with date-stamped `.xlsx` filenames and toast success/failure.

### Verification Centre (Source Exists, Not Currently Routed)
* **Purpose:** Standalone verification dashboard for OCR and signature logs.
* **Main UI Components & Layout:** Header with LIVE badge; stat cards; tabs for OCR ID Scan, Digital Signature, Both Methods; scanner/signature areas; verification log filters and table.
* **Data Fields & Inputs:** Stats from `/api/verification/stats`; logs from `/api/verification/logs`; filters for method and status; signature employee code; signature canvas; OCR scanner result card.
* **Current Workflow/Actions:** OCR scan uses shared OcrScannerPanel and refreshes logs/stats. Signature save posts `/api/verification/signature-log`. This page is imported only as a source file and is not mounted in `App.jsx`.

### Bulk OCR Modal (Source Exists, Not Currently Mounted in Visible Pages)
* **Purpose:** Batch-verify pending issue acknowledgements from a queue using OCR.
* **Main UI Components & Layout:** Large modal with left scanner panel and right progress/queue panel.
* **Data Fields & Inputs:** initialIssues prop, pending queue, verified list, search filter, active target indicator.
* **Current Workflow/Actions:** OCR result matches employee code against pendingIssues; matched issue calls PUT `/api/issues/acknowledge/:issueId` with verification_method `OCR Scan (Bulk Mode)`; verified item moves from pending to verified queue.

## 4. System Workflows & Event Triggers
* Login workflow:
  * User opens `/login`, enters email/password, submits.
  * Client posts `/api/auth/login`.
  * On success, `/api/auth/me` returns admin context and protected routes become available.
  * On 401 from any API call, app dispatches `unauthorized` and redirects to `/login`.
* Employee setup workflow:
  * Admin opens Employees, clicks Add Employee.
  * EmployeeForm captures emp_code, name, department, designation, type, gender, sizes, and status.
  * Backend stores employee record; employee appears in directory and in all issue/replacement selectors.
* Item master setup workflow:
  * Admin opens Items Master, clicks New Item.
  * ItemForm captures item name, category/new category, frequency or fixed due date, and description.
  * Backend stores item and category if needed; item becomes available for issue and replacement request workflows.
* Standard issue workflow:
  * Admin opens Dashboard or Issue Management and opens Bulk Issue Distribution.
  * Admin selects active employee(s), item(s), quantity per item, and issued date.
  * Backend creates issue records with transaction_id, next_due_date, quantity, issued_by, issue_status `Pending Acknowledgement`, lifecycle_status `Active`, and item_condition.
  * Items appear in Issue Management and Employee Asset Profile as pending verification.
* Issue verification workflow:
  * Admin clicks Verify on an issue row or Verify Now on employee profile.
  * UnifiedVerificationModal asks for OCR, Signature, or Dual Mode.
  * OCR path starts camera, captures frame, posts `/api/verification/ocr-scan`, compares scanned employee code to expected employee.
  * Signature path captures canvas as PNG data URL.
  * Client calls `/api/issues/acknowledge/:id` or `/api/issues/acknowledge/employee/:employeeId`.
  * Backend stores signature_path and/or ocr_details, verification_method, acknowledgement_time, acknowledged true, and issue_status `Acknowledged`.
* OCR service trigger:
  * Browser captures a JPEG frame or manual employee code.
  * Node route `/api/verification/ocr-scan` forwards image to Python FastAPI `/scan` or handles manual code lookup.
  * Python OCR service returns extracted/parsed employee code and confidence.
  * Node maps result to employee and logs verification activity.
* Renewal workflow:
  * Admin opens Item Renewal & Return, selects Renew.
  * Modal submits optional notes.
  * Backend archives old issue as `Renewed`, sets lifecycle_status `Returned`, creates a new active issue with `Pending Acknowledgement`, and recalculates next due date.
  * New issue must be verified again through the handover verification flow.
* Return workflow:
  * Admin opens Item Renewal & Return, selects Return.
  * Modal captures returned condition and required remarks.
  * Backend marks record returned, archived, return_date, returned_condition, archive_reason `Returned`, and may increment stock for good condition.
* Archive/reset workflow:
  * Admin opens Issue Management, clicks Reset Issues.
  * Admin chooses all active records or selected rows.
  * Backend archives matching issue records without deleting them.
  * History tab preserves archived records for audit.
* Additional request workflow:
  * Admin opens Replacements, clicks New Request, selects Additional.
  * Admin selects employee; gender-specific official price rates are applied.
  * Admin selects or quick-adds item(s), quantity, size, reason, and notes when required.
  * Backend creates Pending replacement request records with allocation_type `Additional`, unit_cost, total_cost, and payment_status `Pending` when cost exists.
  * Admin approves request, then completes handover via OCR/signature.
  * Completion marks payment_status `Paid` and creates proof evidence.
* Replacement/exchange workflow:
  * Admin opens New Request, selects Replacement.
  * Admin selects employee, replacement item(s), quantity, size, and the previous issued item being replaced.
  * Admin selects old item return status.
  * Request is submitted as Pending, approved by admin, then moved to Handover Queue.
  * During handover, if old item return is required, admin checks item collected before verification.
  * Completion marks request Completed, item_collected true, return_status Returned when applicable, and records verification proof.
* Allocation settings workflow:
  * Admin opens Replacements, expands Allocation Settings.
  * Admin updates default Pant/Shirt/T-Shirt quantities for Permanent and Intern/Temporary employees.
  * Client posts `/api/replacements/configs`; future eligibility/quota checks use updated limits.
* Reporting workflow:
  * Admin opens Reports, applies global and report-specific filters.
  * Export button calls matching `/api/reports/...` endpoint with query parameters.
  * Backend creates Excel workbook and streams it as a blob.
  * Browser downloads date-stamped file and shows toast confirmation.
* Dashboard refresh triggers:
  * Issue creation, acknowledgement, renewal, return, replacement approval, handover, settings update, and archive reset invalidate relevant React Query keys including dashboard stats, issues, replacements, employee profile, due tracking, and upcoming renewals.
* Core database field map:
  * Employee: emp_code, name, department, designation, doj, gender, employee_type, status, sizes.shirt, sizes.pant, sizes.shoe, created_at, updated_at.
  * Item: name, category, validity_period, frequency_days, fixed_date, stock, description, created_at, updated_at.
  * ItemCategory: name, requires_cost_tracking.
  * IssueRecord: transaction_id, employee, employee_name, item, item_name, issued_date, next_due_date, quantity, issued_by, issue_status, lifecycle_status, signature_path, acknowledged, acknowledgement_time, verification_method, ocr_details, notes, item_condition, returned_condition, return_date, archived, archived_at, archived_by, archive_reason, is_renewal.
  * ReplacementRequest: employee, employee_name, item, item_name, allocation_type, allocation_source, reason, exchange_reason, quantity, size, notes, unit_cost, total_cost, payment_status, apply_cost_override, approved_standard_quantity, previous_issue_id, return_status, status, lifecycle_status, requested_date, resolved_date, resolved_by, verification_method, signature_path, ocr_details, item_collected, acknowledged.
  * VerificationLog: type, status, entity_id, entity_type, details, verified_by, created_at, updated_at.
  * OfficialPriceList: item_name, price, gender, description, active, created_at, updated_at.
  * AllocationConfig: item_type, permanent_quantity, newcomer_quantity, standard_quantity, created_at, updated_at.
