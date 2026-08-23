using Microsoft.EntityFrameworkCore;

using TaskTracker.Api.Data;
using TaskTracker.Api.Common;

using TaskTracker.Api.Features.Tasks;
using TaskTracker.Api.Features.Categories;
using TaskTracker.Api.Features.Tags;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Registers a validation endpoint filter on every endpoint. A source generator
// finds the types used as handler parameters IN THIS ASSEMBLY and builds a
// validator for each. Runs after model binding, before the handler — invalid
// input short-circuits to 400 + ValidationProblemDetails and never reaches you.
builder.Services.AddValidation();

builder.Services.AddExceptionHandler<GlobalExeptionHandler>();
builder.Services.AddProblemDetails();

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=tasks.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFE", policy => policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Why put it here? Middleware executes as a stack. Wrapping the pipeline from the very top guarantees it intercepts unhandled exceptions thrown by any downstream middleware or endpoints
app.UseExceptionHandler();

app.UseCors("AllowFE");


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

// Endpoints — one line per feature slice.
app.MapTaskEndpoints();
app.MapCategoryEndpoints();
app.MapTagEndpoints();

app.Run();
