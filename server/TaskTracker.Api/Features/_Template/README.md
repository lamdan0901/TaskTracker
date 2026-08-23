# Feature slice template

Copy this folder, rename it, replace `Thing`/`Things`. Delete what you don't need.

Excluded from compilation via `<Compile Remove="Features/_Template/**/*.cs" />` in the
csproj — so it will never build, and it will never be dead code either. Once you copy
it into `Features/<YourFeature>/` it compiles normally.

## Rules this layout encodes

**One file per reason to change.** A DTO used by exactly one use case lives in that use
case's file — it is meaningless alone. Two DTOs that are peers (`ThingCreateRequest` vs
`ThingUpdateRequest`) get separate files.

**Group by domain, never by purpose.** Do not add `Contracts/`, `Endpoints/`, or
`Services/` subfolders — that rebuilds the layered structure you left, one level deeper.
Subfolders are for sub-*domains* that have their own use cases:

```
Features/Things/
├── ThingEndpoints.cs
├── CreateThing.cs
├── ListThings.cs
└── Comments/              <- own use cases, own DTOs
    ├── AddComment.cs
    └── ListComments.cs
```

**`Features/A/` never references `Features/B/`.** Shared code moves down to `Common/`
or `Data/`. If two slices keep reaching for each other, they were one slice.

**Entities do not live here.** They go in `Data/Entities/` — EF needs one coherent
model, navigation properties cross slice boundaries, and migrations are global. This is
the honest exception to vertical slicing; don't fight it.

## Checklist for a new slice

1. Copy this folder to `Features/<Name>/`, fix the namespace.
2. Add the entity to `Data/Entities/` and a `DbSet<T>` on `AppDbContext`.
3. `dotnet ef migrations add Add<Name>` — and if you ever *move* an entity later,
   patch the hard-coded type string in `Migrations/*.Designer.cs` and
   `AppDbContextModelSnapshot.cs` or EF will generate a drop-and-recreate.
4. Add one line to `Program.cs`: `app.Map<Name>Endpoints();`
5. Validation is automatic — `AddValidation()` is already registered, so DataAnnotations
   attributes on your request records are enforced before the handler runs.
