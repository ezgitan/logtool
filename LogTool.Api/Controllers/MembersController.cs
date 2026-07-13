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

    [HttpPost]
    [ProducesResponseType<MemberDto>(StatusCodes.Status201Created)]
    public async Task<ActionResult<MemberDto>> Add(
        [FromBody] AddMemberRequest request,
        CancellationToken cancellationToken)
    {
        var member = await memberService.AddMemberAsync(request.Name, cancellationToken);
        return CreatedAtAction(nameof(Get), member);
    }

    [HttpDelete("{memberName}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Deactivate(string memberName, CancellationToken cancellationToken)
    {
        await memberService.DeactivateMemberAsync(memberName, cancellationToken);
        return NoContent();
    }
}
