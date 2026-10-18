# ANOVA MBREMS — Inventory & Supply Chain Integration Contract
**Module Owner: Member 2 (Inventory & Supply Chain)**  
**Target Consumers: Member 1 (Auth & Multi-Branch), Member 3 (Kitchen Workflow / Operations), Member 4 (POS / Billing)**  
**Base URL:** `/api/inventory`

---

## 1. Executive Summary & Ownership Boundaries

According to the *ANOVA Team Architecture & Role-Based Access Contract (MBREMS)*:
- **Member 2 owns**:
  - Master Ingredients Catalog & Stock Ledger (`stockByBranch` & `batches`).
  - Unit Conversion & Canonical Dimension Validation (`UnitConversion`).
  - Supplier Profiles & Catalogs.
  - Purchase Orders (PO) & Goods Receiving Notes (GRN).
  - Stock Movements, Transfers (`IN_TRANSIT` isolation), and Wastage tracking.
  - Inventory Valuation (FIFO & Weighted Average) & Threshold Alerts.
- **Member 3 (Kitchen Workflow / Operations)** consumes inventory through defined endpoints:
  - Consuming raw ingredients when recipes/dishes are prepared (`POST /recipe/consume`).
  - Checking ingredient availability prior to order placement (`POST /recipe/check-availability`).
  - Pulling the real-time "86 List" / Out of Stock alerts (`GET /stock-status`).
- **Member 4 (POS / Billing)** queries stock availability in real-time to avoid accepting orders for dishes whose ingredients are exhausted.
- **Member 1 (Auth & Multi-Branch)** issues RFC 7519 JWT Bearer tokens and branch identifiers (`b_downtown` string code or MongoDB `ObjectId`).

---

## 2. Authentication & Authorization Headers

All integration requests **must** include Member 1's standard Bearer JWT:
```http
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Authorized Roles for Kitchen Handshake (`KITCHEN_CONSUME_ROLES`):
`owner`, `admin`, `inventory_manager`, `branch_manager`, `chef`, `kitchen_staff`, `cashier`, `employee`.

---

## 3. Endpoint Specifications

### 3.1. Atomic Recipe Consumption
Deducts raw ingredients when a menu order is prepared or executed on the Kitchen Display System (KDS).

- **Method / URL**: `POST /api/inventory/recipe/consume`
- **Authorized Roles**: `owner`, `admin`, `inventory_manager`, `branch_manager`, `chef`, `kitchen_staff`, `cashier`, `employee`
- **Branch Isolation**: Enforced via `branchGuard`. Non-enterprise staff can only deduct stock from their assigned branch.
- **Atomicity Guarantee**: If **any** ingredient in the request is missing, has invalid units, or lacks sufficient branch stock, the entire request **aborts atomically** with HTTP `400 Bad Request`. **No stock is partially deducted.**

#### Request Payload:
```json
{
  "branch": "b_downtown",
  "orderId": "ORD-2026-9042",
  "orderNumber": "104",
  "preparedBy": "Kitchen Station 2 (Chef Marco)",
  "items": [
    {
      "ingredientId": "6ad0e90a53cc462cbaaec901",
      "quantity": 250,
      "unit": "g"
    },
    {
      "ingredientId": "6ad0e90a53cc462cbaaec902",
      "quantity": 0.5,
      "unit": "L"
    }
  ]
}
```

> **Unit Conversion Note**: If `unit` differs from the ingredient's master `baseUnit` (e.g. recipe requests `250 g` of flour, but inventory is tracked in `kg`), Member 2's engine automatically converts `250 g` -> `0.250 kg`. If units have incompatible dimensions (e.g. `g` to `L`), an error is returned.

#### Success Response (`200 OK`):
```json
{
  "success": true,
  "message": "Recipe ingredients successfully deducted from branch inventory",
  "data": {
    "orderRef": "104",
    "branch": "b_downtown",
    "totalItemsDeducted": 2,
    "deducted": [
      {
        "ingredientId": "6ad0e90a53cc462cbaaec901",
        "sku": "ING-PRO-101",
        "name": "Fresh Avocados",
        "consumedQty": 0.25,
        "baseUnit": "kg",
        "remainingBalance": 14.75,
        "movementId": "6ad0e90a53cc462cbaaec999",
        "isLowStock": false,
        "isOutOfStock": false
      }
    ],
    "lowStockAlerts": []
  }
}
```

#### Rejection / Insufficient Stock Response (`400 Bad Request`):
```json
{
  "success": false,
  "message": "Recipe consumption aborted: 1 item(s) failed validation",
  "errors": [
    {
      "index": 1,
      "ingredientId": "6ad0e90a53cc462cbaaec902",
      "name": "Whole Milk",
      "available": 0.2,
      "required": 0.5,
      "unit": "L",
      "error": "Insufficient stock for Whole Milk at branch 'b_downtown'. Available: 0.2 L, Required: 0.5 L"
    }
  ]
}
```

---

### 3.2. Real-Time Pre-Flight Stock Availability Check
Allows Member 3 (Kitchen KDS) or Member 4 (POS Terminal) to verify whether all required ingredients for an order or menu item are available before confirming an order.

- **Method / URL**: `POST /api/inventory/recipe/check-availability`
- **Authorized Roles**: `owner`, `admin`, `inventory_manager`, `branch_manager`, `chef`, `kitchen_staff`, `cashier`, `employee`
- **Non-Destructive**: Queries stock without altering balances or creating audit logs.

#### Request Payload:
```json
{
  "branch": "b_downtown",
  "items": [
    {
      "ingredientId": "6ad0e90a53cc462cbaaec901",
      "quantity": 2,
      "unit": "kg"
    }
  ]
}
```

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "All ingredients available for order",
  "data": {
    "branch": "b_downtown",
    "allAvailable": true,
    "items": [
      {
        "ingredientId": "6ad0e90a53cc462cbaaec901",
        "sku": "ING-PRO-101",
        "name": "Fresh Avocados",
        "requestedQty": 2,
        "requestedUnit": "kg",
        "requiredInBaseUnit": 2,
        "baseUnit": "kg",
        "availableStock": 14.75,
        "isSufficient": true,
        "deficit": 0
      }
    ]
  }
}
```

---

### 3.3. Real-Time Branch Stock Status & "86 List"
Returns all ingredients that are completely out of stock or critically low for a given branch so Member 3 and Member 4 can automatically mark dishes as unavailable.

- **Method / URL**: `GET /api/inventory/stock-status?branch=b_downtown`
- **Authorized Roles**: All authenticated staff

#### Response (`200 OK`):
```json
{
  "success": true,
  "message": "Branch stock status and 86-list retrieved",
  "data": {
    "branch": "b_downtown",
    "timestamp": "2026-10-18T12:50:00.000Z",
    "counts": {
      "outOfStock": 1,
      "criticallyLow": 2,
      "lowStock": 3,
      "totalAlerts": 6
    },
    "outOfStock": [
      {
        "ingredientId": "6ad0e90a53cc462cbaaec905",
        "sku": "ING-DAI-201",
        "name": "Organic Heavy Cream",
        "category": "Dairy",
        "baseUnit": "L",
        "currentStock": 0,
        "minThreshold": 5,
        "status": "OUT_OF_STOCK"
      }
    ],
    "criticallyLow": [],
    "lowStock": []
  }
}
```

---

## 4. Cross-Module Entity Reference Conventions

| Entity | Field Name | Type | Notes |
| :--- | :--- | :--- | :--- |
| **Branch** | `branch` | `String` | Accepts branch code (`b_downtown`) or 24-hex string (`6ad0e90a...`) |
| **Branch Ref** | `branchRef` | `ObjectId` | Optional Mongoose `ObjectId` referencing Member 1's `Branch` model |
| **User (Audit)**| `user` / `createdByUser` | `ObjectId` | Mongoose `ObjectId` referencing Member 1's `User` model |
| **Order Ref** | `reference` | `String` | `ORD-<orderNumber>` linking to Member 3/4 order entity |
| **Quantity** | Numeric | `Number` | Floats rounded to 3 decimal places (`0.001`) |
| **Currency** | Numeric | `Number` | Monies rounded to 2 decimal places (`0.01` INR) |

---

## 5. UI Integration Guidelines (Git Merge Safety)

- **Member 2 Encapsulation**: All Member 2 screens and components are isolated under `client/src/modules/inventory/`.
- **Top-Level Mount**: To embed Inventory in Member 1's shared application layout:
  ```jsx
  import { InventoryModule, inventoryNavigation } from './modules/inventory';

  // Inside Member 1 root router or tab shell:
  <InventoryModule activeTab={currentTab} />
  ```
- **Shared Sidebar & App.jsx**: Do not overwrite root navigation routes. Member 2 exports `inventoryNavigation` containing the 7 sub-module navigation routes.
