# Run this ON the target server, as Administrator, to safely update LogTool
# to a new build WITHOUT ever touching Data\ (VAPID keys, push
# subscriptions - the Excel file itself should live outside Data\, see
# README's "Excel file location" section). A manual "copy the publish
# folder over, but remember to skip Data\" update is one careless click
# away from wiping saved reminder subscriptions - this script makes that
# mistake impossible by excluding Data\ from the copy at the tool level.
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

# Sanity-check the new build BEFORE touching anything live. Without this, an
# incomplete or empty copy into $NewBuildPath (interrupted transfer, an
# empty folder created but never filled, etc.) would make the /MIR mirror
# below delete the working install - this exact thing happened once, so
# it's not a hypothetical.
$exePath = Join-Path $NewBuildPath "LogTool.Api.exe"
if (-not (Test-Path $exePath)) {
    throw "'$exePath' was not found - the new build looks incomplete or wrong. " +
        "Nothing was touched. Copy the full publish folder into '$NewBuildPath' and try again."
}
$fileCount = (Get-ChildItem $NewBuildPath -Recurse -File | Measure-Object).Count
if ($fileCount -lt 20) {
    throw "The new build only contains $fileCount file(s) - too few for a real self-contained " +
        "publish (expect 50+). Nothing was touched. Re-copy '$NewBuildPath' and try again."
}

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
Write-Host "Done. Data\ (VAPID keys, push subscriptions) was left untouched."
Write-Host "You can delete '$NewBuildPath' now if you like - it's already merged into '$LivePath'."
