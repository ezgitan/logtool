# Run this ON the target server, as Administrator, to pull the latest build
# from GitHub and deploy it WITHOUT ever touching Data\ (the Excel file,
# VAPID keys, push subscriptions). Manages its own clone folder (clones on
# first run, pulls on every run after) - you don't need to think about it
# or set anything up by hand.
#
# Usage (repeatable - same command every time):
#   .\update-server.ps1 -LivePath "C:\LogTool\publish"
#
# First run clones into $ClonePath; later runs just git-pull it. Override
# -ClonePath or -RepoUrl only if the defaults below don't match your setup.

param(
    [Parameter(Mandatory = $true)]
    [string]$LivePath,

    [string]$RepoUrl = "https://github.com/ezgitan/logtool.git",
    [string]$ClonePath = "C:\LogTool-clone",
    [string]$ServiceName = "LogTool"
)

if (-not (Test-Path $LivePath)) { throw "Live install path not found: $LivePath" }

if (Test-Path (Join-Path $ClonePath ".git")) {
    Write-Host "Pulling latest changes into '$ClonePath'..."
    Push-Location $ClonePath
    git pull
    $pullExitCode = $LASTEXITCODE
    Pop-Location
    if ($pullExitCode -ne 0) { throw "git pull failed with exit code $pullExitCode. Nothing was touched." }
} else {
    Write-Host "No existing clone at '$ClonePath' - cloning '$RepoUrl'..."
    git clone $RepoUrl $ClonePath
    if ($LASTEXITCODE -ne 0) { throw "git clone failed with exit code $LASTEXITCODE. Nothing was touched." }
}

$NewBuildPath = Join-Path $ClonePath "publish"

# Sanity-check the pulled build BEFORE touching anything live. Without this,
# an incomplete pull or a repo layout mismatch would make the /MIR mirror
# below delete the working install - this exact thing happened once with a
# manually-managed staging folder, so it's not a hypothetical.
$exePath = Join-Path $NewBuildPath "LogTool.Api.exe"
if (-not (Test-Path $exePath)) {
    throw "'$exePath' was not found - the pulled build looks incomplete or wrong. " +
        "Nothing was touched. Check '$ClonePath' and try again."
}
$fileCount = (Get-ChildItem $NewBuildPath -Recurse -File | Measure-Object).Count
if ($fileCount -lt 20) {
    throw "The pulled build only contains $fileCount file(s) - too few for a real self-contained " +
        "publish (expect 50+). Nothing was touched. Check '$ClonePath' and try again."
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
Write-Host "Done. Data\ (Excel file, VAPID keys, push subscriptions) was left untouched."
