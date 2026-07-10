namespace LogTool.Api.Exceptions;

public abstract class LogToolException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

public sealed class ExcelFileNotFoundException(string path)
    : LogToolException("excel_file_not_found", $"Excel dosyası bulunamadı: {Path.GetFileName(path)}");

public sealed class ExcelFileLockedException()
    : LogToolException("excel_file_locked", "Excel dosyası başka bir işlem tarafından kullanılıyor.");

public sealed class WorksheetNotFoundException(string worksheetName)
    : LogToolException("worksheet_not_found", $"Gerekli Excel çalışma sayfası bulunamadı: {worksheetName}");

public sealed class MemberNotFoundException(string memberName)
    : LogToolException("member_not_found", $"Kullanıcı Excel dosyasında bulunamadı: {memberName}");

public sealed class InactiveMemberException(string memberName)
    : LogToolException("inactive_member", $"Kullanıcı aktif değil: {memberName}");

public sealed class DateNotFoundException(DateOnly date, string worksheetName)
    : LogToolException("date_not_found", $"{date:dd.MM.yyyy} tarihi {worksheetName} çalışma sayfasında bulunamadı.");

public sealed class InvalidAttendanceException(string attendance)
    : LogToolException("invalid_attendance", $"Attendance değeri geçersiz: {attendance}");

public sealed class LogSaveException()
    : LogToolException("log_save_failed", "Log kaydedilemedi.");

public sealed class LogAlreadySubmittedException(DateOnly date)
    : LogToolException("log_already_submitted", $"{date:dd.MM.yyyy} tarihi için log zaten girilmiş, güncellenemez.");

public sealed class InvalidPeriodException()
    : LogToolException("invalid_period", "Geçerli bir yıl ve ay belirtilmelidir.");
