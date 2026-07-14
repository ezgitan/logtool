# LogTool launcher

`Open LogTool.vbs` is what each person runs instead of typing the site
address. It runs `whoami /upn` **on their own PC** (not the server),
completely hidden — no console window flashes — and opens the site
with that identity pre-filled, so nobody has to type anything, sign
in, or even see that a lookup happened. From the user's point of view
they just open LogTool and they're in.

## Why this exists

The LogTool server isn't joined to the company Active Directory
domain, so it can't do real Windows sign-in (Kerberos/NTLM) itself.
Each person's own PC usually *is* domain-joined though, so this
launcher reads the identity there instead and just tells the site who
you are.

**This is not real authentication** — anyone who edits the link could
type in someone else's name. That's an accepted trade-off for this
internal, low-stakes tool (the previous version didn't check
passwords either). Don't rely on this for anything sensitive.

## Rolling this out

Two ways to distribute this, from least to most polished:

1. **Just the script**: copy `Open LogTool.vbs` to each person's
   Desktop or Start Menu (shared drive, login script, or email).
   Double-clicking the `.vbs` file directly works fine.
2. **A proper desktop icon** (recommended — looks like a normal app,
   not a stray script file): copy this whole `launcher` folder
   somewhere on each PC (or a shared network path everyone can read),
   then run once:
   ```powershell
   .\create-shortcut.ps1
   ```
   This creates a "LogTool" shortcut on that user's Desktop. No admin
   rights needed. Double-clicking it runs the same hidden whoami
   lookup and opens the site — it just looks like clicking an app
   icon instead of running a script.

If you rename the site later from an IP to a real hostname, update
the `siteUrl` line inside `Open LogTool.vbs` and redistribute it (the
shortcut keeps pointing at the same `.vbs` file, so you don't need to
recreate shortcuts — just update the one script).
