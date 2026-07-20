using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/push")]
public sealed class PushController(
    PushSubscriptionStore store,
    VapidKeyProvider vapidKeyProvider,
    AdminNotificationService adminNotificationService) : ControllerBase
{
    [HttpGet("public-key")]
    [ProducesResponseType<VapidPublicKeyDto>(StatusCodes.Status200OK)]
    public ActionResult<VapidPublicKeyDto> GetPublicKey() =>
        Ok(new VapidPublicKeyDto(vapidKeyProvider.PublicKey));

    [HttpGet("settings")]
    [ProducesResponseType<PushSettingsDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<PushSettingsDto>> GetSettings(
        [FromQuery] string memberName,
        CancellationToken cancellationToken)
    {
        var all = await store.GetAllAsync(cancellationToken);
        if (all.TryGetValue(memberName, out var settings) && settings.Subscriptions.Count > 0)
        {
            return Ok(new PushSettingsDto(settings.ReminderHour, settings.ReminderMinute));
        }

        return Ok(new PushSettingsDto(null, null));
    }

    [HttpPost("subscribe")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Subscribe(
        [FromBody] RegisterPushSubscriptionRequest request,
        CancellationToken cancellationToken)
    {
        if (request.ReminderHour is < 0 or > 23 || request.ReminderMinute is < 0 or > 59)
        {
            return BadRequest(new ApiErrorDto("invalid_reminder_time", "A valid hour and minute must be provided."));
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

    [HttpPost("notify-all")]
    [ProducesResponseType<SendNotificationResultDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SendNotificationResultDto>> NotifyAll(
        [FromBody] SendAdminNotificationRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new ApiErrorDto("invalid_message", "A message is required."));
        }

        var recipientCount = await adminNotificationService.SendToAllAsync(request.Message.Trim(), cancellationToken);
        return Ok(new SendNotificationResultDto(recipientCount));
    }

    [HttpPost("notify/{memberName}")]
    [ProducesResponseType<SendNotificationResultDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<SendNotificationResultDto>> NotifyMember(
        string memberName,
        [FromBody] SendAdminNotificationRequestDto request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new ApiErrorDto("invalid_message", "A message is required."));
        }

        var recipientCount = await adminNotificationService.SendToMemberAsync(memberName, request.Message.Trim(), cancellationToken);
        return Ok(new SendNotificationResultDto(recipientCount));
    }
}
