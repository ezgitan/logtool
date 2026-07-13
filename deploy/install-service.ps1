# Run this ON the target server as Administrator, after copying the
# published output there (e.g. to C:\LogTool).
param(
    [string]$InstallPath = "C:\LogTool",
    [string]$ServiceName = "LogTool"
)

$exePath = Join-Path $InstallPath "LogTool.Api.exe"
if (-not (Test-Path $exePath)) {
    throw "Could not find $exePath. Copy the published output there first."
}

if (-not [System.Diagnostics.EventLog]::SourceExists("LogTool")) {
    New-EventLog -LogName Application -Source "LogTool"
}

sc.exe create $ServiceName binPath= "`"$exePath`"" start= auto | Out-Null
sc.exe description $ServiceName "LogTool internal work-log application" | Out-Null
sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null

Write-Host "Service '$ServiceName' created."
Write-Host "Start it with: Start-Service $ServiceName"
Write-Host "View logs with: Get-EventLog -LogName Application -Source $ServiceName -Newest 20"
