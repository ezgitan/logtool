using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/logs")]
public sealed class LogsController(
    LogService logService,
    MissingLogService missingLogService) : ControllerBase
{
    [HttpGet("{memberName}")]
    [ProducesResponseType<LogEntryDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<LogEntryDto>> Get(
        string memberName,
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken) =>
        Ok(await logService.GetAsync(memberName, date, cancellationToken));

    [HttpPut("{memberName}/{date}")]
    [ProducesResponseType<LogEntryDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<LogEntryDto>> Update(
        string memberName,
        DateOnly date,
        [FromBody] UpdateLogEntryDto request,
        CancellationToken cancellationToken) =>
        Ok(await logService.UpdateAsync(memberName, date, request, cancellationToken));

    [HttpGet("{memberName}/range")]
    [ProducesResponseType<IReadOnlyList<LogEntryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<LogEntryDto>>> GetRange(
        string memberName,
        [FromQuery] DateOnly start,
        [FromQuery] DateOnly end,
        CancellationToken cancellationToken) =>
        Ok(await logService.GetRangeAsync(memberName, start, end, cancellationToken));

    [HttpGet("{memberName}/missing")]
    [ProducesResponseType<IReadOnlyList<MissingLogDayDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<MissingLogDayDto>>> GetMissing(
        string memberName,
        CancellationToken cancellationToken) =>
        Ok(await missingLogService.GetAsync(memberName, cancellationToken));

    [HttpGet("daily")]
    [ProducesResponseType<IReadOnlyList<DailyLogEntryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<DailyLogEntryDto>>> GetDaily(
        [FromQuery] DateOnly date,
        CancellationToken cancellationToken) =>
        Ok(await logService.GetDailyAsync(date, cancellationToken));
}
