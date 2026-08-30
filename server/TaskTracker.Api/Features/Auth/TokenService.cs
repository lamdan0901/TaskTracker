using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using TaskTracker.Api.Data.Entities;

namespace TaskTracker.Api.Features.Auth;

public sealed class TokenService(IConfiguration config)
{
  public (string Token, DateTime ExpiresAt) CreateAccessToken(User user)
  {
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(config["Jwt:Key"]!));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

    // Claims are the payload of the token — the facts the API will trust
    // on every later request without touching the database.
    // Keep them small: they travel on EVERY request.
    // TODO: explain line by line this block
    var claims = new[]
    {
      new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
      new Claim(JwtRegisteredClaimNames.Email, user.Email),
      new Claim(JwtRegisteredClaimNames.Jti,  Guid.NewGuid().ToString())
    };

    // "[Jwt:...]" is from appsettings.json
    var expires = DateTime.UtcNow.AddMinutes(config.GetValue<int>("Jwt:AccessTokenMinutes"));

    var token = new JwtSecurityToken(
      issuer: config["Jwt:Issuer"],
      audience: config["Jwt:Audience"],
      claims: claims,
      expires: expires,
      signingCredentials: creds
    );

    return (new JwtSecurityTokenHandler().WriteToken(token), expires);
  }
}