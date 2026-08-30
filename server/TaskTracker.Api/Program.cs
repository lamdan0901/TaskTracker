using Microsoft.EntityFrameworkCore;

using TaskTracker.Api.Data;
using TaskTracker.Api.Common;
using System.Text.Json.Serialization;

using TaskTracker.Api.Features.Tasks;
using TaskTracker.Api.Features.Categories;
using TaskTracker.Api.Features.Tags;
using TaskTracker.Api.Features.Auth;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Registers a validation endpoint filter on every endpoint. A source generator
// finds the types used as handler parameters IN THIS ASSEMBLY and builds a
// validator for each. Runs after model binding, before the handler — invalid
// input short-circuits to 400 + ValidationProblemDetails and never reaches you.
builder.Services.AddValidation();

// Configure JSON serializer to accept and return enums as strings ("Low", "Medium", "High", "Urgent")
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

builder.Services.AddExceptionHandler<GlobalExeptionHandler>();
builder.Services.AddProblemDetails();
builder.Services.AddSingleton<TokenService>();

// Turn OFF the inbound claim renaming (explained below).
// Must run before the first JWT token is validated, so top of Program.cs is safest.
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(options =>
{
    // Must match what TokenService used to SIGN the token
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,          // rejects expired tokens
        ValidateIssuerSigningKey = true,  // the one that actually stops forgery
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)),
        ClockSkew = TimeSpan.FromSeconds(30),
    };
});

builder.Services.AddAuthorization();
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite("Data Source=tasks.db"));

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFE", policy => policy.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod());
});

var app = builder.Build();

// Why put it here? Middleware executes as a stack. Wrapping the pipeline from the very top guarantees it intercepts unhandled exceptions thrown by any downstream middleware or endpoints
app.UseExceptionHandler();
app.UseCors("AllowFE");
app.UseAuthentication();  // who are you? (reads + validates the Bearer token → ClaimsPrincipal)
app.UseAuthorization();   // are you allowed? (checks RequireAuthorization)
app.UseHttpsRedirection();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Endpoints — one line per feature slice.
app.MapAuthEndpoints();
app.MapTaskEndpoints();
app.MapCategoryEndpoints();
app.MapTagEndpoints();

app.Run();
