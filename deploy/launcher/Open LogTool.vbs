' Double-click this (or the "LogTool" desktop shortcut created by
' create-shortcut.ps1) to open LogTool with your identity pre-filled.
' It runs "whoami /upn" locally on your own PC, completely hidden (no
' console window), and passes the result to the site so you don't have
' to type anything or sign in.
'
' Copy this file (and keep it next to nothing else it depends on) to your
' desktop or Start Menu. If your company sets up a real hostname later,
' update the siteUrl value below to match.

siteUrl = "https://10.96.250.14/"

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
tempFile = fso.GetSpecialFolder(2) & "\" & fso.GetTempName()

' windowStyle 0 = hidden, waitOnReturn = True: runs whoami with no visible
' window at all and blocks until it's done, so we can read its output.
shell.Run "%comspec% /c whoami /upn > """ & tempFile & """ 2>nul", 0, True

upn = ""
If fso.FileExists(tempFile) Then
    Set f = fso.OpenTextFile(tempFile, 1)
    If Not f.AtEndOfStream Then
        upn = Trim(f.ReadLine)
    End If
    f.Close
    fso.DeleteFile tempFile, True
End If

If upn = "" Then
    MsgBox "Could not determine your Windows account. Make sure this PC is signed in to the company domain.", vbExclamation, "LogTool"
Else
    shell.Run siteUrl & "?identity=" & upn, 1, False
End If
