#### The Problem: An Infinite Loop ♾️

Look at the two entities and how they point to each other:

- `Category` has `public List<TaskItem> Tasks`
- `TaskItem` has `public Category? Category`

Now, imagine you return a `Category` entity directly from your endpoint:

```csharp
// If you did: return Results.Ok(category);
```

When ASP.NET Core tries to serialize it into JSON, it goes down a rabbit hole:

1. Starts serializing `Category`: `{ "id": 1, "name": "Work", "tasks": [`
2. Serializes Task 1: `{ "id": 10, "title": "Report", "category": `
3. Serializes Task 1's Category: `{ "id": 1, "name": "Work", "tasks": [`
4. Serializes Task 1 again: `{ "id": 10, ... "category": `
5. 💥 **CRASH!** `System.Text.Json.JsonException: A possible object cycle was detected.`

#### The Solution: DTOs & Projections (`.Select()`)

When you use a DTO like `CategoryResponse(int Id, string Name, int TaskCount, DateTime CreatedAt)`, there is **no circular object graph**. You only send flat, clean JSON:

```json
{
  "id": 1,
  "name": "Work",
  "taskCount": 3,
  "createdAt": "2026-08-22T08:00:00Z"
}
```
