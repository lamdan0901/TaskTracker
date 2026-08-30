### 🔍 Summary of Findings

| Item                             | Phase A Section |         Status          | Issue / Notes                                                                                                                                                                                                              |
| :------------------------------- | :-------------- | :---------------------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Entities & Configurations**    | `A1`            |         ✅ Done         | `User`, `OwnerId` on `TaskItem`, `Category`, `Tag`, unique composite indexes, and `DbSet<User>` configured properly.                                                                                                       |
| **Packages & Configuration**     | `A2`            |         ✅ Done         | `JwtBearer` & `Identity.Core` packages installed; user-secrets initialized.                                                                                                                                                |
| **Auth Feature Slice**           | `A3`            | ⚠️ **Unfinished / Bug** | `Me.cs` parses `sub` using `Guid.Parse(id!)` instead of `int.Parse(id!)` — will throw HTTP 500 runtime exception.                                                                                                          |
| **`ICurrentUser` Claim Reading** | `A4`            |       ⚠️ **Bug**        | `Program.cs` cleared `DefaultInboundClaimTypeMap`, so inbound claims are named `"sub"`, but `CurrentUser.cs` looks for `ClaimTypes.NameIdentifier`. As a result, `CurrentUser.Id` is always `null` when a JWT is received! |
| **OwnerId Assignment on Writes** | `A4`            |    ⚠️ **Unfinished**    | `CreateCategory.cs` and `CreateTag.cs` do not inject `ICurrentUser` or assign `OwnerId = currentUser.RequireId()`.                                                                                                         |
| **Endpoint Authorization**       | `A5`            |    ⚠️ **Unfinished**    | `CategoryEndpoints.cs` and `TagEndpoints.cs` map endpoints directly on `app` without `.RequireAuthorization()`.                                                                                                            |
| **Runnable HTTP Test Suite**     | `A6`            |    ⚠️ **Unfinished**    | `TaskTracker.Api.http` still only contains the placeholder weather forecast request.                                                                                                                                       |
| **Client Implementation**        | `A7`            |       ⏳ Pending        | Not started yet (`LoginForm.tsx`, `auth.ts`, `api.ts` token header & 401 handling, `App.tsx`).                                                                                                                             |

---

### 🛠️ Required Server Fixes (Step-by-Step Guidance)

Per the pair-programming guidelines, here are the code snippets and where to update them in `server/`:

#### 1. Fix `CurrentUser.cs` (Claim Mapping Mismatch)

📁 **File:** [server/TaskTracker.Api/Common/ICurrentUser.cs](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/Common/ICurrentUser.cs)

> **Why:** Because `Program.cs` executes `JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear()`, the incoming JWT subject claim stays named `"sub"`. Checking both `JwtRegisteredClaimNames.Sub` and `ClaimTypes.NameIdentifier` ensures `CurrentUser.Id` resolves correctly in all scenarios.

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TaskTracker.Api.Common;

public interface ICurrentUser
{
    int? Id { get; }
    int RequireId();
}

public sealed class CurrentUser(IHttpContextAccessor accessor) : ICurrentUser
{
    public int? Id
    {
        get
        {
            var user = accessor.HttpContext?.User;
            if (user is null) return null;

            // When DefaultInboundClaimTypeMap is cleared, "sub" is not converted to ClaimTypes.NameIdentifier
            var subClaim = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                        ?? user.FindFirstValue(ClaimTypes.NameIdentifier);

            return int.TryParse(subClaim, out var id) ? id : null;
        }
    }

    public int RequireId() => Id ?? throw new InvalidOperationException("No authenticated user on this request.");
}
```

---

#### 2. Fix `Me.cs` (`Guid.Parse` → `int.Parse`)

📁 **File:** [server/TaskTracker.Api/Features/Auth/Me.cs](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/Features/Auth/Me.cs)

> **Why:** User IDs are integer PKs (`int`), not GUIDs. `Guid.Parse("1")` throws a `FormatException`.

```csharp
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace TaskTracker.Api.Features.Auth;

public static class Me
{
    public static void Map(IEndpointRouteBuilder app) =>
        app.MapGet("/api/auth/me", Handle).RequireAuthorization();

    private static IResult Handle(ClaimsPrincipal user)
    {
        var idStr = user.FindFirstValue(JwtRegisteredClaimNames.Sub)
                 ?? user.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = user.FindFirstValue(JwtRegisteredClaimNames.Email)
                 ?? user.FindFirstValue(ClaimTypes.Email);

        if (!int.TryParse(idStr, out var id))
        {
            return Results.Unauthorized();
        }

        return Results.Ok(new { Id = id, Email = email });
    }
}
```

---

#### 3. Update `CreateCategory.cs` & `CategoryEndpoints.cs`

📁 **File:** [server/TaskTracker.Api/Features/Categories/CreateCategory.cs](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/Features/Categories/CreateCategory.cs)

> **Why:** Global query filters only protect reads automatically. Writes (inserts) must explicitly populate `OwnerId = currentUser.RequireId()`.

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Categories;

public sealed record CategoryCreateRequest(
    [Required(AllowEmptyStrings = false, ErrorMessage = "Category name is required.")]
    [MaxLength(50)]
    string Name
);

public static class CreateCategory
{
    public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/categories", Handle);

    private static async Task<IResult> Handle(
        CategoryCreateRequest req,
        AppDbContext db,
        ICurrentUser currentUser,
        CancellationToken ct)
    {
        var trimmedName = req.Name.Trim();
        var exists = await db.Categories.AnyAsync(c => c.Name == trimmedName, ct);
        if (exists)
        {
            return Results.Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Duplicate category",
                Detail = $"A category with the name '{trimmedName}' already exists."
            });
        }

        var category = new Category
        {
            Name = trimmedName,
            OwnerId = currentUser.RequireId()
        };

        db.Categories.Add(category);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/categories/{category.Id}", category);
    }
}
```

📁 **File:** [server/TaskTracker.Api/Features/Categories/CategoryEndpoints.cs](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/Features/Categories/CategoryEndpoints.cs)

```csharp
namespace TaskTracker.Api.Features.Categories;

public static class CategoryEndpoints
{
    public static void MapCategoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("").RequireAuthorization();

        ListCategories.Map(group);
        CreateCategory.Map(group);
        DeleteCategory.Map(group);
    }
}
```

---

#### 4. Update `CreateTag.cs` & `TagEndpoints.cs`

📁 **File:** [server/TaskTracker.Api/Features/Tags/CreateTag.cs](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/Features/Tags/CreateTag.cs)

```csharp
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TaskTracker.Api.Common;
using TaskTracker.Api.Data;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Tags;

public sealed record TagCreateRequest(
    [Required(AllowEmptyStrings = false, ErrorMessage = "Tag name is required.")]
    [MaxLength(50)]
    string Name
);

public static class CreateTag
{
    public static void Map(IEndpointRouteBuilder app) => app.MapPost("/api/tags", Handle);

    public static async Task<IResult> Handle(
        TagCreateRequest req,
        AppDbContext db,
        ICurrentUser currentUser,
        CancellationToken ct)
    {
        var trimmedName = req.Name.Trim();
        var exists = await db.Tags.AnyAsync(t => t.Name == trimmedName, ct);
        if (exists)
        {
            return Results.Conflict(new ProblemDetails
            {
                Status = StatusCodes.Status409Conflict,
                Title = "Duplicate tag",
                Detail = $"A tag with the name '{trimmedName}' already exists."
            });
        }

        var tag = new Tag
        {
            Name = trimmedName,
            OwnerId = currentUser.RequireId()
        };

        db.Tags.Add(tag);
        await db.SaveChangesAsync(ct);

        return Results.Created($"/api/tags/{tag.Id}", tag);
    }
}
```

📁 **File:** [server/TaskTracker.Api/Features/Tags/TagEndpoints.cs](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/Features/Tags/TagEndpoints.cs)

```csharp
namespace TaskTracker.Api.Features.Tags;

public static class TagEndpoints
{
    public static void MapTagEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("").RequireAuthorization();

        ListTags.Map(group);
        CreateTag.Map(group);
        DeleteTag.Map(group);
    }
}
```

---

#### 5. Runnable Test Suite (`A6`)

📁 **File:** [server/TaskTracker.Api/TaskTracker.Api.http](file:///c:/Users/dungd/OneDrive/Desktop/Work/TEST/TaskTracker/server/TaskTracker.Api/TaskTracker.Api.http)

```http
@Host = http://localhost:5228

### 1. Register User A
POST {{Host}}/api/auth/register
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "Password123!"
}

### 2. Register User B
POST {{Host}}/api/auth/register
Content-Type: application/json

{
  "email": "bob@example.com",
  "password": "Password123!"
}

### 3. Login User A (Copy accessToken)
# @name loginAlice
POST {{Host}}/api/auth/login
Content-Type: application/json

{
  "email": "alice@example.com",
  "password": "Password123!"
}

@aliceToken = {{loginAlice.response.body.token}}

### 4. Login User B (Copy accessToken)
# @name loginBob
POST {{Host}}/api/auth/login
Content-Type: application/json

{
  "email": "bob@example.com",
  "password": "Password123!"
}

@bobToken = {{loginBob.response.body.token}}

### 5. Verify Me Endpoint for Alice
GET {{Host}}/api/auth/me
Authorization: Bearer {{aliceToken}}

### 6. Alice creates a task (Note created task ID)
# @name createAliceTask
POST {{Host}}/api/tasks
Authorization: Bearer {{aliceToken}}
Content-Type: application/json

{
  "title": "Alice's Secret Task",
  "priority": "High"
}

@aliceTaskId = {{createAliceTask.response.body.id}}

### 7. Alice can view her task (Expect 200 OK)
GET {{Host}}/api/tasks/{{aliceTaskId}}
Authorization: Bearer {{aliceToken}}

### 8. Bob attempts to view Alice's task (Expect 404 Not Found - Data Scoping check!)
GET {{Host}}/api/tasks/{{aliceTaskId}}
Authorization: Bearer {{bobToken}}

### 9. Bob attempts to edit Alice's task (Expect 404 Not Found)
PUT {{Host}}/api/tasks/{{aliceTaskId}}
Authorization: Bearer {{bobToken}}
Content-Type: application/json

{
  "title": "Hacked by Bob"
}
```

---

### 🚀 Next Steps: Client Implementation (A7)

For the client under `client/TaskTracker/`, we are ready to implement:

1. **`src/auth.ts`**: Helper storage functions (`getToken()`, `setToken()`, `clearToken()`, `getUser()`).
2. **`src/components/LoginForm.tsx`**: Login & Register tabs, form validation, error display, and premium UI styling matching the existing theme.
3. **`src/api.ts`**: Attach `Authorization: Bearer <token>` to all HTTP requests and auto-clear auth on `401 Unauthorized`.
4. **`src/App.tsx`**: Add auth state gate (render `LoginForm` when logged out, main task manager with a user profile & logout button in the header when logged in).
