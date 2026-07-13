# Deploying LogTool to the company network

LogTool runs as a single ASP.NET Core app that serves both the API and
the built frontend, hosted on **HTTP.sys** (not Kestrel) so Windows
Integrated Authentication (SSO) works reliably.

Target server: **10.96.250.14**

## 1. Build and publish (on this dev machine)

```powershell
.\deploy\publish.ps1
```

This creates a self-contained `.\publish` folder (includes the .NET
runtime, so the target server doesn't need .NET installed) with the
frontend already bundled in, plus your current Excel file(s) copied
into `Data\`.

Copy the `publish` folder (and the `deploy` folder) to the target
server, e.g. to `C:\LogTool`.

## 2. Generate a self-signed HTTPS certificate (on the target server, as Administrator)

Push notifications require HTTPS (browsers block them over plain HTTP
except on `localhost`). Run this on the target server itself:

```powershell
cd C:\LogTool
.\deploy\generate-cert.ps1
```

This installs the certificate into the Windows certificate store and
binds it to port 5443 via `netsh` — HTTP.sys picks it up automatically,
there's no file path or password to configure anywhere.

Browsers will show a "not secure" / self-signed warning the first
time each person visits — that's expected and just needs a one-time
"proceed anyway" click. There's no way around that without a real
CA-issued certificate.

## 3. Open the firewall (on the target server, as Administrator)

```powershell
.\deploy\open-firewall.ps1 -Port 5443
```

## 4. Run it

For a quick test, just run it directly:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
.\LogTool.Api.exe
```

Then browse to `https://10.96.250.14:5443` from another machine on
the network. You should be signed in automatically via your Windows
account — no login screen.

## 5. Install as a Windows Service (so it survives reboots/logouts)

Once step 4 works, install it as an always-on service instead:

```powershell
[Environment]::SetEnvironmentVariable('ASPNETCORE_ENVIRONMENT', 'Production', 'Machine')
.\deploy\install-service.ps1 -InstallPath "C:\LogTool"
Start-Service LogTool
```

Logs (startup errors, exceptions) go to Windows Event Viewer under
**Application** log, source **LogTool**.

## Troubleshooting sign-in

- **"Could not verify your identity"** on a client machine usually
  means the browser isn't sending Windows credentials automatically —
  check that the server is reachable and that the browser trusts it
  for Integrated Authentication (see below). This is a browser/network
  setting, not something the app can fix.
- For company-wide seamless sign-in (no per-user setup), IT should
  push a Group Policy setting `AuthServerAllowlist` (Chrome/Edge) that
  includes `10.96.250.14` (or the real hostname if one gets set up
  later) so every managed machine trusts it automatically. Without
  this policy, each machine may need it set individually.
- The identity resolution also depends on Active Directory being
  reachable from the server (to resolve a person's UPN, e.g.
  `ezgi.tan@nxp.com`, from their Windows login). If AD can't be
  reached, it falls back to the raw Windows account name, which likely
  won't match anyone in the Excel roster.

## Notes

- Only run **one instance** of the app against the Excel file at a
  time — the in-app locking only protects against concurrent access
  within a single process.
- The VAPID keys and push subscriptions (`Data/vapid-keys.json`,
  `Data/push-subscriptions.json`) are generated fresh on first run at
  the new location — that's expected, everyone will need to
  (re)enable reminders once on the new site.
- To update the app later: re-run `publish.ps1`, stop the service
  (`Stop-Service LogTool`), copy over the new files (keep `Data\`),
  then `Start-Service LogTool` again. The certificate binding from
  step 2 persists across updates — no need to re-run it.
