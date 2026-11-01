# Core HR

## Overview

The Core HR module groups branch administration and employee-related
workflows for ANOVA. It supports organizing staff information and access
in a multi-branch restaurant environment.

## Functional areas

-   **Branch management:** Maintain branch details and branch status.
-   **Employee management:** Maintain employee records and role
    assignments.
-   **Role-based access:** Organize permitted functions by user role.
-   **Branch-level access:** Restrict branch-related activity according
    to a user's assignment.
-   **Shift management:** Organize employee shifts.
-   **Leave management:** Support employee leave requests and related
    workflows.
-   **Audit trail:** Record important actions where audit logging is
    implemented.

## Access and security

The backend should verify the user's role and branch assignment for
every protected operation. Frontend-only restrictions are not sufficient
to secure employee or branch data.

## Related areas

-   [Main project README](./README.md)
-   [Inventory & Supply Chain](./INVENTORY-SUPPLY-CHAIN-README.md)
-   [Restaurant Ops](./RESTAURANT-OPS-README.md)

## Implementation note

This document groups capabilities listed in the project README. Verify
the current routes, permissions, and UI before treating every item as
implemented in a particular deployment.
