# TaskTracker

A full-stack task management application designed for learning and practicing modern **ASP.NET Core (.NET 10)** backend architecture and **React 19 + TypeScript + Vite** frontend development.

---

## 🏗️ Architecture & Project Structure

```text
TaskTracker/
├── .vscode/                 # VS Code debugging and task automation
│   ├── launch.json          # .NET Core Launch profile (F5 debugging)
│   └── tasks.json           # Build, publish, and watch tasks
├── client/
│   └── TaskTracker/         # React 19 + TypeScript + Vite Frontend
│       ├── src/
│       │   ├── components/  # TaskTable, CategoryManager, TaskForm, etc.
│       │   ├── hooks/       # useTheme and custom hooks
│       │   ├── api.ts       # Type-safe API client and error handling
│       │   └── types.ts     # Data contracts & DTOs
│       ├── package.json
│       └── vite.config.ts   # Vite dev server with proxy to backend
├── server/
│   ├── TaskTracker.Api/     # ASP.NET Core 10 Web API
│   │   ├── Common/          # GlobalExceptionHandler, Validation filters, PagedResult
│   │   ├── Data/            # EF Core DbContext, Entities, Entity Configurations
│   │   ├── Features/        # Vertical Slice Features (Tasks, Categories)
│   │   ├── Migrations/      # EF Core database migrations
│   │   ├── Program.cs       # Minimal API bootstrap & pipeline configuration
│   │   └── tasks.db         # SQLite database file (generated at runtime)
│   └── TaskTracker.slnx     # .NET solution file
├── docs/                    # Architecture and query optimization notes
└── learning-docs/           # In-depth explanations for C# and EF Core concepts
```

---

## 📋 Prerequisites

Make sure you have the following installed on your machine:

- **[.NET 10 SDK](https://dotnet.microsoft.com/download)** (or latest compatible .NET SDK)
- **[Node.js](https://nodejs.org/)** (v20.x or later recommended)
- **[pnpm](https://pnpm.io/)** (or `npm` / `yarn`)
- **[Git](https://git-scm.com/)**
- Optional: **[dotnet-ef](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)** global tool for running EF Core migrations:
  ```bash
  dotnet tool install --global dotnet-ef
  ```

---

## 🚀 Getting Started

Follow these steps to initialize and run the project locally.

### 1. Backend Setup (.NET 10 Web API)

1. Navigate to the API project directory:
   ```bash
   cd server/TaskTracker.Api
   ```

2. *(Optional)* Apply EF Core migrations to initialize or update the SQLite database:
   ```bash
   dotnet ef database update
   ```
   > **Note:** When the application runs, it uses the local SQLite database file `tasks.db`.

3. Run the backend server:
   ```bash
   dotnet run
   ```
   Or run with hot-reload during development:
   ```bash
   dotnet watch
   ```

4. The backend will be available at:
   - **HTTP:** `http://localhost:5228`
   - **HTTPS:** `https://localhost:7191`
   - **OpenAPI Schema:** `http://localhost:5228/openapi/v1.json`

> **VS Code Tip:** You can also run and debug the backend directly in VS Code by opening the `Run & Debug` tab and selecting **.NET Core Launch (web)** (or pressing `F5`).

---

### 2. Frontend Setup (React + Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd client/TaskTracker
   ```

2. Install dependencies:
   ```bash
   pnpm install
   # or: npm install
   ```

3. Start the Vite development server:
   ```bash
   pnpm dev
   # or: npm run dev
   ```

4. Open your browser and navigate to:
   ```text
   http://localhost:5173
   ```

> **Proxy Configuration:** Vite is configured in `vite.config.ts` to automatically proxy all `/api/*` HTTP requests from `http://localhost:5173` to `http://localhost:5228`, preventing CORS issues during development.

---

## 📡 API Endpoints Summary

### Tasks (`/api/tasks`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/tasks` | Get paginated list of tasks (supports `search`, `isDone`, `categoryId`, `sortBy`, `sortDir`, `pageIndex`, `pageSize`) |
| `GET` | `/api/tasks/{id}` | Get single task details |
| `POST` | `/api/tasks` | Create a new task (`title`, `categoryId`) |
| `PUT` | `/api/tasks/{id}` | Update task details (`title`, `isDone`, `categoryId`) |
| `DELETE`| `/api/tasks/{id}` | Delete a task |
| `PUT` | `/api/tasks/mark-all` | Batch update completion status for all tasks (`isDone: true/false`) |

### Categories (`/api/categories`)
| Method | Route | Description |
| :--- | :--- | :--- |
| `GET` | `/api/categories` | List all categories with task counts |
| `POST` | `/api/categories` | Create a new category (`name`) |
| `DELETE`| `/api/categories/{id}` | Delete a category |

---

## 💡 Key Features & Concepts Demonstrated

- **Vertical Slice Architecture:** Handlers and endpoints are organized by feature domain (`Features/Tasks/`, `Features/Categories/`) rather than traditional layered folders.
- **Minimal APIs:** Lightweight endpoint routing in ASP.NET Core.
- **Entity Framework Core (SQLite):** Migrations, relationship mappings, and index optimizations.
- **Validation Pipeline:** Endpoint filters validating incoming requests before hitting handlers.
- **Global Exception Handling:** Standardized error responses compliant with `ProblemDetails` (RFC 7807).
- **Modern React 19 Frontend:** Clean UI with dark/light mode toggle, instant search, category filtering, and batch actions.

---

## 📚 Learning Resources & Documentation

- [server/INTRO.MD](file:///server/INTRO.MD) — Introduction to ASP.NET Core concepts and Program.cs flow.
- [docs/ef-core-query-notes.md](file:///docs/ef-core-query-notes.md) — EF Core query translation, eager loading, and pitfalls.
- [learning-docs/](file:///learning-docs/) — Guides on handling circular references, mutations, and error handling.
