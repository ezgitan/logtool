using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/push")]
public sealed class PushController(
    PushSubscriptionStore store,
    VapidKeyProvider vapidKeyProvider) : ControllerBase
{
    [HttpGet("public-key")]
    [ProducesResponseType<VapidPublicKeyDto>(StatusCodes.Status200OK)]
    public ActionResult<VapidPublicKeyDto> GetPublicKey() =>
        Ok(new VapidPublicKeyDto(vapidKeyProvider.PublicKey));

    [HttpPost("subscribe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Subscribe(
        [FromBody] RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ReminderHour is < 0 or > 23 || request.ReminderMinute is < 0 or > 59)
        {
            return BadRequest(new ApiErrorDto("invalid_reminder_time", "Geçerli bir saat ve dakika belirtilmelidir."));
        }

        await store.SaveSubscriptionAsync(
            request.MemberName,
            new PushSubscriptionRecord
            {
                Endpoint = request.Subscription.Endpoint,
                P256dh = request.Subscription.Keys.P256dh,
                Auth = request.Subscription.Keys.Auth,
            },
            request.ReminderHour,
            request.ReminderMinute,
            cancellationToken);

        return NoContent();
    }
}
