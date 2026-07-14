# Run this ON the target server, as Administrator, to safely update LogTool
# to a new build WITHOUT ever touching Data\ (the Excel file, VAPID keys,
# push subscriptions). A manual "copy the publish folder over, but remember
# to skip Data\" update is one careless click away from wiping everyone's
# saved reminder subscriptions - this script makes that mistake impossible
# by excluding Data\ from the copy at the tool level, not by remembering to.
#
# Usage:
#   1. Copy the new build to a STAGING folder (not the live one), e.g. copy
#      the dev machine's `publish\` folder to "C:\LogTool\publish-new".
#   2. Run:
#      .\update-server.ps1 -NewBuildPath "C:\LogTool\publish-new" -LivePath "C:\LogTool\publish"

param(
    [Parameter(Mandatory = $true)]
    [string]$NewBuildPath,

    [Parameter(Mandatory = $true)]
    [string]$LivePath,

    [string]$ServiceName = "LogTool"
)

if (-not (Test-Path $NewBuildPath)) { throw "New build path not found: $NewBuildPath" }
if (-not (Test-Path $LivePath)) { throw "Live install path not found: $LivePath" }

Write-Host "Stopping service '$ServiceName'..."
Stop-Service $ServiceName -ErrorAction Stop

Write-Host "Copying new build into place (Data\ is excluded - never copied, never deleted)..."
robocopy $NewBuildPath $LivePath /MIR /XD Data /R:2 /W:2 /NFL /NDL /NJH /NJS
if ($LASTEXITCODE -ge 8) {
    Start-Service $ServiceName -ErrorAction SilentlyContinue
    throw "robocopy failed with exit code $LASTEXITCODE - service restarted with the old build, nothing changed."
}

Write-Host "Starting service '$ServiceName'..."
Start-Service $ServiceName

Write-Host ""
Write-Host "Done. Data\ (Excel file, VAPID keys, push subscriptions) was left untouched."
Write-Host "You can delete '$NewBuildPath' now if you like - it's already merged into '$LivePath'."
