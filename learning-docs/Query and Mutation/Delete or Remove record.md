In EF Core, there are **two ways** to delete records:

#### Way A: The Traditional Way (Load into Memory First)

```csharp
var category = await db.Categories.FindAsync([id], ct); // 1. SELECT query to SQLite
if (category is null) return Results.NotFound();

db.Categories.Remove(category);                         // 2. Mark as Deleted in memory
await db.SaveChangesAsync(ct);                          // 3. DELETE SQL statement to SQLite
```

- **Round trips:** 2 SQL statements (`SELECT`, then `DELETE`).
- **Memory:** Loads the entire row into server memory first.
  _(Note: In your current `DeleteCategory.cs`, make sure you don't forget `await db.SaveChangesAsync(ct);` after `Remove()`!)_

---

#### Way B: `ExecuteDeleteAsync` (.NET 7+ Feature)

`ExecuteDeleteAsync` sends a direct SQL `DELETE` query to the database **without loading the entity into memory**:

```csharp
var affectedRows = await db.Categories
    .Where(c => c.Id == id)
    .ExecuteDeleteAsync(ct); // Sends: DELETE FROM Categories WHERE Id = @id

return affectedRows == 0 ? Results.NotFound() : Results.NoContent();
```

#### Comparison:

| Feature                  | `db.Remove() + SaveChangesAsync()`                         | `ExecuteDeleteAsync()`                           |
| :----------------------- | :--------------------------------------------------------- | :----------------------------------------------- |
| **Database Round-trips** | 2 (`SELECT` + `DELETE`)                                    | **1 (`DELETE` directly)**                        |
| **Memory usage**         | Allocates C# object in memory                              | **Zero object allocation**                       |
| **Return value**         | Nothing                                                    | Returns number of deleted rows (`0` = not found) |
| **Best used for**        | When you need business logic on the entity before deleting | Fast bulk deletes or simple ID-based deletes     |

---

If you just need to delete an item by ID without inspecting its properties in C# first, **`ExecuteDeleteAsync` is strictly better** for performance and simplicity.

### Why it's better:

1. **Halves database round-trips**: 1 SQL query (`DELETE`) instead of 2 (`SELECT` then `DELETE`).
2. **Zero memory allocation**: Doesn't allocate C# objects or track anything in memory.
3. **Atomic & Race-condition safe**: Directly deletes in the database engine.

---

### When would you still need the traditional `FindAsync` + `Remove`?

Only when you need **C# business logic** before deciding to delete, for example:

- **Authorization check**: `if (task.OwnerId != currentUserId) return Results.Forbid();`
- **Status guard**: `if (task.IsArchived) return Results.BadRequest("Cannot delete archived task");`
- **Logging/Auditing**: `logger.LogInformation("User deleted task titled '{Title}'", task.Title);`
