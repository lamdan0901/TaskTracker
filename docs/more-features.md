### Path 1: Relational Data & EF Core Relationships _(Recommended Next Step)_

Right now `TaskItem` is a standalone table. In real-world backends, entities almost always relate to one another.

- **Option A: Categories / Lists (One-to-Many `1 : N`)**
  - **Feature**: Organize tasks into Categories (e.g., "Work", "Personal", "Study"). A category has many tasks; a task belongs to one category.
  - **What you'll learn**:
    - EF Core Foreign Keys & Navigation properties (`CategoryId`, `Category`).
    - Eager loading (`.Include()`) vs Projection (`.Select()`).
    - Adding a new feature slice (`Features/Categories/`) and linking slices via `Data/Entities/`.
    - Handling relational cascading deletes vs `SetNull`.
- **Option B: Tags (Many-to-Many `N : M`)**
  - **Feature**: Attach multiple tags (e.g., `#urgent`, `#frontend`, `#bug`) to tasks.
  - **What you'll learn**:
    - EF Core many-to-many skip navigations and join tables.
    - Querying tasks filtered by multiple tags (e.g., `?tags=urgent,frontend`).
- **Option C: Subtasks / Checklist Items (Nested Domain Slice)**
  - **Feature**: Break down a task into smaller checklist items (`POST /api/tasks/{id}/subtasks`).
  - **What you'll learn**:
    - Sub-domain feature structure (e.g., `Features/Tasks/Subtasks/`).
    - Aggregate root thinking (managing child entities through their parent).

---

### Path 2: Rich Domain Fields & Advanced Querying

- **Feature: Due Dates, Priority Levels & Soft Deletes**
  - **What you'll learn**:
    - **Enums in EF Core & APIs**: `Priority` (`Low`, `Medium`, `High`, `Urgent`).
    - **Date/Time handling**: `DateOnly` vs `DateTimeOffset` (UTC storage vs user timezone comparisons).
    - **Custom Query Filters**: Querying `?status=overdue`, `?due=today`, `?due=this-week`.
    - **Soft Deletes**: Adding `IsDeleted` flag and configuring **EF Core Global Query Filters** (`HasQueryFilter`) so deleted items are hidden automatically without rewriting every query.

---

### Path 3: Authentication & Multi-Tenancy (User-Scoped Data)

- **Feature: User Accounts & Per-User Tasks**
  - **What you'll learn**:
    - Authentication vs Authorization in ASP.NET Core.
    - JWT Bearer tokens or ASP.NET Core Identity API endpoints (`MapIdentityApi`).
    - Reading `ClaimsPrincipal` in Minimal API endpoint handlers.
    - Scoping every query and mutation to `CurrentUser.Id` so users cannot access each other's tasks.
    - Securing endpoints with `.RequireAuthorization()`.

---

### Path 4: Background Processing & Async Jobs

- **Feature: Background Service for Overdue Notifications / Cleanup**
  - **What you'll learn**:
    - Implementing `BackgroundService` / `IHostedService`.
    - Working with `PeriodicTimer` in .NET.
    - **Service Lifetimes in practice**: Safely resolving scoped services (like `AppDbContext`) inside a singleton background worker using `IServiceScopeFactory`.

---

### Path 5: Caching & Performance

- **Feature: Task Statistics & Output Caching**
  - **What you'll learn**:
    - Endpoint `GET /api/tasks/stats` (counts of total, completed, pending, overdue).
    - ASP.NET Core **Output Caching** middleware (`app.UseOutputCache()`).
    - Cache eviction / invalidation using cache tags when tasks are created/updated/deleted.

---

### Path 6: Connect the Frontend (Client Integration)

- **Feature: Wire up the React + Vite Client in `client/TaskTracker`**
  - **What you'll learn**:
    - Consuming the REST API endpoints, pagination, and sorting from the UI.
    - Gracefully handling validation errors and `ProblemDetails` returned by your global exception handler.

---

### Where should we start?

If you want to strengthen your EF Core and architecture skills first, **Path 1 (Categories or Subtasks)** is the most natural next progression.

Which feature interests you most? Let me know, and we'll break it down step-by-step with design, code templates, explanations, and file locations for you to implement!
