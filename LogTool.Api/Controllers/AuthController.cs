using System.DirectoryServices.AccountManagement;
using LogTool.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/auth")]
public sealed class AuthController(ILogger<AuthController> logger) : ControllerBase
{
    [HttpGet("whoami")]
    [Authorize]
    [ProducesResponseType<WhoAmIResponseDto>(StatusCodes.Status200OK)]
    public IActionResult WhoAmI()
    {
        var rawName = User.Identity?.Name;
        if (string.IsNullOrWhiteSpace(rawName))
        {
            return Unauthorized();
        }

        var separatorIndex = rawName.IndexOf('\\');
        var samAccountName = separatorIndex >= 0 ? rawName[(separatorIndex + 1)..] : rawName;

        return Ok(new WhoAmIResponseDto(ResolveIdentity(samAccountName)));
    }

    private string ResolveIdentity(string samAccountName)
    {
        try
        {
            using var context = new PrincipalContext(ContextType.Domain);
            using var user = UserPrincipal.FindByIdentity(context, IdentityType.SamAccountName, samAccountName);
            var upn = user?.UserPrincipalName;

            if (!string.IsNullOrWhiteSpace(upn))
            {
                return upn.Split('@')[0];
            }
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Could not resolve UPN from Active Directory for {SamAccountName}; falling back to the Windows account name.",
                samAccountName);
        }

        return samAccountName;
    }
}
