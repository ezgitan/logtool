var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService();
builder.WebHost.UseHttpSys();
builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddEventLog(settings => settings.SourceName = "LogTool");

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.Configure<LogTool.Api.Options.ExcelOptions>(
    builder.Configuration.GetSection(LogTool.Api.Options.ExcelOptions.SectionName));
builder.Services.AddSingleton<LogTool.Api.Services.ExcelService>();
builder.Services.AddSingleton<LogTool.Api.Services.ExcelSchemaService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<LogTool.Api.Services.MemberService>();
builder.Services.AddScoped<LogTool.Api.Services.LogService>();
builder.Services.AddScoped<LogTool.Api.Services.MissingLogService>();
builder.Services.AddScoped<LogTool.Api.Services.MonthlyReportService>();
builder.Services.AddScoped<LogTool.Api.Services.AttendanceGridService>();
builder.Services.AddSingleton<LogTool.Api.Services.VapidKeyProvider>();
builder.Services.AddSingleton<LogTool.Api.Services.PushSubscriptionStore>();
builder.Services.AddSingleton<LogTool.Api.Services.NotificationStore>();
builder.Services.AddScoped<LogTool.Api.Services.AdminNotificationService>();
builder.Services.AddHttpClient();
builder.Services.AddSingleton<LogTool.Api.Services.HolidayService>();
builder.Services.AddHostedService<LogTool.Api.Services.DateRolloverService>();
builder.Services.AddHostedService<LogTool.Api.Services.ReminderNotificationService>();
builder.Services.AddHostedService<LogTool.Api.Services.HolidayCacheRefreshService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseDefaultFiles();
app.UseStaticFiles();
app.UseMiddleware<LogTool.Api.Middleware.ApiExceptionMiddleware>();
app.MapControllers();
app.MapFallbackToFile("index.html");

app.Run();

public partial class Program;
