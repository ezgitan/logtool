' Double-click this to open LogTool with your identity pre-filled.
' It runs "whoami /upn" locally on your own PC (never sent anywhere except
' as part of the URL you open) and passes it to the site so you don't have
' to type anything.
'
' Copy this file (and keep it next to nothing else it depends on) to your
' desktop or Start Menu. If your company sets up a real hostname later,
' update the siteUrl value below to match.

siteUrl = "https://10.96.250.14/"

Set shell = CreateObject("WScript.Shell")
Set execResult = shell.Exec("%comspec% /c whoami /upn")
Do While execResult.Status = 0
    WScript.Sleep 50
Loop
upn = Trim(execResult.StdOut.ReadAll())

If upn = "" Then
    MsgBox "Could not determine your Windows account. Make sure this PC is signed in to the company domain.", vbExclamation, "LogTool"
Else
    shell.Run siteUrl & "?identity=" & upn
End If
