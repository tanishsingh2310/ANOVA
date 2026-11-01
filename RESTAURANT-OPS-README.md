# Restaurant Ops

## Overview

The Restaurant Ops module groups day-to-day restaurant workflows,
including menu management, order processing, table workflows, and
billing.

## Functional areas

-   **Menu management:** Maintain menu items and related details.
-   **Order management:** Process orders and manage order statuses.
-   **Table management:** Support table and dine-in workflows.
-   **Billing and payments:** Manage bills and payment records or
    statuses according to the implemented workflow.
-   **Operational reporting:** Review available summaries related to
    restaurant activity.
-   **Branch-aware operations:** Associate activities with the relevant
    branch where supported.

## Typical workflow

1.  Maintain menu information.
2.  Create or receive an order through the supported interface.
3.  Update the order as it progresses through the implemented statuses.
4.  Manage table or dine-in details when applicable.
5.  Complete the billing and record the supported payment status.
6.  Review available operational summaries.

The actual workflow and supported statuses should be confirmed against
the current frontend and backend.

## Security and reliability

-   Validate order identifiers and request data on the backend.
-   Check the user's permissions and branch access before changing
    orders or bills.
-   Ensure order-status transitions follow the application's rules.
-   Do not treat a payment as processed unless the backend's configured
    payment workflow confirms it.

## Related areas

-   [Main project README](./README.md)
-   [Core HR](./CORE-HR-README.md)
-   [Customer Analytics](./CUSTOMER-ANALYTICS-README.md)
-   [Inventory & Supply Chain](./INVENTORY-SUPPLY-CHAIN-README.md)

## Implementation note

This README groups the restaurant operations capabilities listed in the
project documentation. Payment gateway integration and GPS-based
delivery tracking are identified as future enhancements, not confirmed
existing features.
