namespace LogTool.Api.Exceptions;

public abstract class LogToolException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class ExcelFileNotFoundException(string path)
    : LogToolException("excel_file_not_found", $"Excel file not found: {Path.GetFileName(path)}");

public sealed class ExcelFileLockedException()
    : LogToolException("excel_file_locked", "The Excel file is being used by another process.");

public sealed class WorksheetNotFoundException(string worksheetName)
    : LogToolException("worksheet_not_found", $"Required Excel worksheet not found: {worksheetName}");

public sealed class MemberNotFoundException(string memberName)
    : LogToolException("member_not_found", $"User not found in the Excel file: {memberName}");

public sealed class InactiveMemberException(string memberName)
    : LogToolException("inactive_member", $"User is not active: {memberName}");

public sealed class DateNotFoundException(DateOnly date, string worksheetName)
    : LogToolException("date_not_found", $"{date:dd.MM.yyyy} was not found in the {worksheetName} worksheet.");

public sealed class InvalidAttendanceException(string attendance)
    : LogToolException("invalid_attendance", $"Invalid attendance value: {attendance}");

public sealed class LogSaveException()
    : LogToolException("log_save_failed", "Failed to save the log.");

public sealed class LogAlreadySubmittedException(DateOnly date)
    : LogToolException("log_already_submitted", $"A log has already been submitted for {date:dd.MM.yyyy} and cannot be edited.");

public sealed class BankHolidayLockedException(DateOnly date)
    : LogToolException("bank_holiday_locked", $"{date:dd.MM.yyyy} is an official public holiday and cannot be changed.");

public sealed class InvalidPeriodException()
    : LogToolException("invalid_period", "A valid year and month must be provided.");

public sealed class InvalidMemberNameException()
    : LogToolException("invalid_member_name", "A valid user name must be provided.");

public sealed class MemberAlreadyExistsException(string memberName)
    : LogToolException("member_already_exists", $"User already exists: {memberName}");
