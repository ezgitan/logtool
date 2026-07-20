using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public sealed class NotificationsController(NotificationStore store) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<IReadOnlyList<NotificationDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<NotificationDto>>> Get(
        [FromQuery] string memberName,
        CancellationToken cancellationToken)
    {
        var records = await store.GetForMemberAsync(memberName, cancellationToken);
        return Ok(records.Select(record => new NotificationDto(record.Id, record.Message, record.SentAt, record.Read)).ToList());
    }

    [HttpPost("mark-read")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarkRead([FromQuery] string memberName, CancellationToken cancellationToken)
    {
        await store.MarkAllReadAsync(memberName, cancellationToken);
        return NoContent();
    }

    [HttpDelete("{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(string id, [FromQuery] string memberName, CancellationToken cancellationToken)
    {
        await store.DeleteAsync(memberName, id, cancellationToken);
        return NoContent();
    }

    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearAll([FromQuery] string memberName, CancellationToken cancellationToken)
    {
        await store.ClearAllAsync(memberName, cancellationToken);
        return NoContent();
    }
}
