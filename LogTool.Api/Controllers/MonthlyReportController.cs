using LogTool.Api.Models;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/monthly-report")]
public sealed class MonthlyReportController(MonthlyReportService monthlyReportService) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType<MonthlyReportDto>(StatusCodes.Status200OK)]
    public async Task<ActionResult<MonthlyReportDto>> Get(
        [FromQuery] int year,
        [FromQuery] int month,
        CancellationToken cancellationToken) =>
        Ok(await monthlyReportService.GetAsync(year, month, cancellationToken));
}
