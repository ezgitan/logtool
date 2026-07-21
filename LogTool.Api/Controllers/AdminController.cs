using LogTool.Api.Models;
using LogTool.Api.Options;
using LogTool.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;

namespace LogTool.Api.Controllers;

[ApiController]
[Route("api/admin")]
public sealed class AdminController(
    IOptions<ExcelOptions> excelOptions,
    AdminMessageHistoryStore messageHistoryStore) : ControllerBase
{
    [HttpGet("excel-link")]
    [ProducesResponseType<ExcelLinkDto>(StatusCodes.Status200OK)]
    public ActionResult<ExcelLinkDto> GetExcelLink() =>
        Ok(new ExcelLinkDto(excelOptions.Value.NetworkPath));

    [HttpGet("message-history")]
    [ProducesResponseType<IReadOnlyList<AdminMessageHistoryDto>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<AdminMessageHistoryDto>>> GetMessageHistory(CancellationToken cancellationToken)
    {
        var records = await messageHistoryStore.GetAllAsync(cancellationToken);
        return Ok(records.Select(record => new AdminMessageHistoryDto(record.Id, record.Message, record.Target, record.SentAt)).ToList());
    }

    [HttpDelete("message-history/{id}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteMessage(string id, CancellationToken cancellationToken)
    {
        await messageHistoryStore.DeleteAsync(id, cancellationToken);
        return NoContent();
    }

    [HttpDelete("message-history")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ClearMessageHistory(CancellationToken cancellationToken)
    {
        await messageHistoryStore.ClearAllAsync(cancellationToken);
        return NoContent();
    }
}
