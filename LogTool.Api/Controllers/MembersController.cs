using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/members")]
public sealed class MembersController(MemberService memberService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<MemberDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MemberDto>>> Get(CancellationToken cancellationToken) =>
        Ok(await memberService.GetActiveMembersAsync(cancellationToken));
}
