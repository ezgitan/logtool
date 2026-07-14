# LogTool launcher

`Open LogTool.vbs` is what each person double-clicks instead of typing
the site address. It runs `whoami /upn` **on their own PC** (not the
server) and opens the site with that identity pre-filled, so nobody
has to type anything or remember an address.

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

Copy `Open LogTool.vbs` to each person's Desktop or Start Menu (e.g.
via a shared drive, a login script, or just emailing it). If you
rename the site later from an IP to a real hostname, update the
`siteUrl` line inside the file and redistribute it.
