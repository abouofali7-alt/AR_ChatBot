Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)

WshShell.CurrentDirectory = appDir

' Start server in background (hidden window)
WshShell.Run "cmd /c cd /d """ & appDir & "\backend"" && node server.js", 0, False

' Wait for server to be ready
WScript.Sleep 2500

' Open in Edge/Chrome app mode (no address bar = looks like native app)
Dim url
url = "http://localhost:3000"
Dim opened
opened = False

' Try Edge
Dim edgePath
edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
If fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=" & url & " --window-size=1200,800 --window-name=AR_ChatBot --disable-features=TranslateUI", 1, False
    opened = True
End If

If Not opened Then
    ' Try Chrome
    Dim chromePath
    chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
    If fso.FileExists(chromePath) Then
        WshShell.Run """" & chromePath & """ --app=" & url & " --window-size=1200,800 --window-name=AR_ChatBot", 1, False
        opened = True
    End If
End If

If Not opened Then
    ' Fallback: default browser
    WshShell.Run url, 1, False
End If
