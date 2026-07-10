var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.Logging.AddConsole();

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
builder.Services.AddSingleton<LogTool.Api.Services.VapidKeyProvider>();
builder.Services.AddSingleton<LogTool.Api.Services.PushSubscriptionStore>();
builder.Services.AddHostedService<LogTool.Api.Services.DateRolloverService>();
builder.Services.AddHostedService<LogTool.Api.Services.ReminderNotificationService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();
app.UseMiddleware<LogTool.Api.Middleware.ApiExceptionMiddleware>();
app.MapControllers();

app.Run();

public partial class Program;
