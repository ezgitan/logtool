using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/attendance-grid")]
public sealed class AttendanceController(AttendanceGridService attendanceGridService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<AttendanceGridDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AttendanceGridDto>> Get(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken) =>
        Ok(await attendanceGridService.GetAsync(year, month, cancellationToken));
}
