using System.ComponentModel.DataAnnotations;

namespace LogTool.Api.Models;

public sealed record UpdateLogEntryDto(
    [Required] string Attendance,
    [Required, MaxLength(10000)] string Log);
