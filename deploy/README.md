# Deploying LogTool to the company network

LogTool runs as a single ASP.NET Core app that serves both the API and
the built frontend, hosted on **HTTP.sys**.

Target server: **10.96.250.14** (not domain-joined — see "How sign-in
works" below for what that means for identity).

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
binds it to port 443 via `netsh` — HTTP.sys picks it up automatically,
there's no file path or password to configure anywhere.

(Port 443, the standard HTTPS port, instead of a custom port like
5443 — some corporate firewalls between network segments only allow
well-known ports through, even if a raw TCP connection to a custom
port appears to succeed.)

Browsers will show a "not secure" / self-signed warning the first
time each person visits, and reminder notifications won't work until
they trust the certificate. Nobody needs to be handed a file for
this — the site itself serves a one-time setup script (see "How
sign-in works" below) that trusts the certificate and signs them in,
downloaded directly from the login page.

## 3. Open the firewall (on the target server, as Administrator)

```powershell
.\deploy\open-firewall.ps1 -Port 443
```

## 4. Run it

For a quick test, run it **as Administrator** (HTTP.sys requires either
admin rights or a `netsh http add urlacl` reservation to bind a
wildcard `https://+:...` address — the Windows Service in step 5 runs
as LocalSystem, which already has this, so this is only needed for
manual testing):

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Production"
.\LogTool.Api.exe
```

Then, from another machine, open the site using the launcher (see
below) — not by typing the address directly, since the launcher is
what supplies your identity.

## 5. Install as a Windows Service (so it survives reboots/logouts)

Once step 4 works, install it as an always-on service instead:

```powershell
[Environment]::SetEnvironmentVariable('ASPNETCORE_ENVIRONMENT', 'Production', 'Machine')
.\deploy\install-service.ps1 -InstallPath "C:\LogTool"
Start-Service LogTool
```

Logs (startup errors, exceptions) go to Windows Event Viewer under
**Application** log, source **LogTool**.

## How sign-in works

The server (10.96.250.14) is **not joined to the company Active
Directory domain**, so it has no way to validate anyone's Windows
credentials itself — neither automatically nor by prompting for a
password. That rules out real Windows Integrated Authentication here.

Instead, sign-in works one of two ways, and nothing needs to be
distributed to anyone out-of-band — both are self-serve from the site:

1. **Type your email** — the login page just asks for a company email
   address (no password). Works from any browser, anywhere, with zero
   setup. This is the fallback every person can always use.
2. **One-time setup script** — the login page also links to
   `/setup.vbs`, generated on the fly by the server (see
   `LogTool.Api/Controllers/SetupController.cs`). It bundles the
   site's current certificate and, run once, trusts it and opens the
   site signed in via `whoami /upn` — after that, reminder
   notifications work and there's no email to type. It's downloaded
   from the site itself, not emailed or copied via a network share.

Both are **not real authentication** — they trust whatever identity is
provided (typed email, or the local Windows account name). That
matches the trust level this tool already had before (no password was
ever checked). If the server gets properly domain-joined later, this
can be swapped back for real Windows sign-in.

The `deploy/launcher/` folder (a separately-distributed `.vbs` +
cert-trust scripts) still works too, but is no longer the primary
path — `/setup.vbs` supersedes it since it needs no distribution.

## Notes

- Only run **one instance** of the app against the Excel file at a
  time — the in-app locking only protects against concurrent access
  within a single process.
- The VAPID keys and push subscriptions (`Data/vapid-keys.json`,
  `Data/push-subscriptions.json`) are generated fresh on first run at
  the new location — that's expected, everyone will need to
  (re)enable reminders once on the new site.
- **If `Data\vapid-keys.json` is ever lost or overwritten** (e.g. a
  manual copy accidentally replaced it), every existing person's
  reminder subscription becomes permanently invalid — pushes start
  failing with `401`/`403` and nothing will fix it except each person
  re-enabling notifications from scratch. The app logs a warning to
  Event Viewer (Application, source `LogTool`) whenever it has to
  generate a fresh VAPID key pair, so this is easy to spot after the
  fact if reminders mysteriously stop working. To avoid causing it in
  the first place, always update via `update-server.ps1` (below)
  rather than a manual folder copy.

## Updating to a new build

Don't manually copy the `publish` folder over the live one — it's one
missed "except Data\" away from silently invalidating every saved
reminder subscription. Instead:

1. On the dev machine: `.\deploy\publish.ps1`.
2. Copy the resulting `publish` folder to the server into a
   **staging** location, not over the live install - e.g.
   `C:\LogTool\publish-new`. Make sure the copy actually completed
   (check `Test-Path "C:\LogTool\publish-new\LogTool.Api.exe"` is
   `True`) before continuing.
3. On the server, as Administrator:
   ```powershell
   .\deploy\update-server.ps1 -NewBuildPath "C:\LogTool\publish-new" -LivePath "C:\LogTool\publish"
   ```
   This stops the service, mirrors the new build into place while
   **excluding `Data\` entirely** (not "copy but remember to skip
   it" — the tool itself can't touch it), and restarts the service.
   It also refuses to touch anything live if `$NewBuildPath` looks
   incomplete or empty (missing `LogTool.Api.exe`, or suspiciously
   few files) - a bad or interrupted copy is caught before it can
   delete the working install, not after. The certificate binding
   persists across updates automatically, no need to re-run
   `generate-cert.ps1`.

## Excel file location

By default the Excel file lives in `Data\` next to the app, which
`update-server.ps1` protects from ever being touched during an
update. If you'd rather keep the Excel file entirely outside the app
folder (e.g. a shared drive or a `share\` folder on the Desktop that
other tools/people also touch), point `Excel:FilePath` in
`appsettings.Production.json` at an absolute path instead:

```json
{
  "Urls": "https://+:443",
  "Excel": {
    "FilePath": "C:\\Users\\logtool\\Desktop\\share\\LogFileLastT.xlsx"
  }
}
```

An absolute path here is used as-is; no code change needed. This
also means the file survives even a *manual*, un-audited copy of the
`publish` folder, since it's no longer inside it at all.
