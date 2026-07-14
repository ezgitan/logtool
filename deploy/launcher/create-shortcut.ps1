# Creates a "LogTool" desktop shortcut that runs Open LogTool.vbs silently.
# Run this once per PC (no admin rights needed). After this, the user just
# double-clicks the "LogTool" icon on their desktop like any other app —
# whoami and the URL construction happen invisibly in the background.
#
# Usage:
#   .\create-shortcut.ps1

param(
    [string]$LauncherPath = (Join-Path $PSScriptRoot "Open LogTool.vbs"),
    [string]$ShortcutName = "LogTool"
)

if (-not (Test-Path $LauncherPath)) {
    throw "Launcher script not found at: $LauncherPath"
}

$desktop = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktop "$ShortcutName.lnk"

$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:WINDIR "System32\wscript.exe"
$shortcut.Arguments = "//nologo `"$LauncherPath`""
$shortcut.WorkingDirectory = Split-Path $LauncherPath
$shortcut.Description = "Open LogTool"
$shortcut.IconLocation = (Join-Path $env:WINDIR "System32\shell32.dll") + ",13"
$shortcut.Save()

Write-Host "Shortcut created: $shortcutPath"
Write-Host "Double-click it to open LogTool — whoami runs hidden in the background."
