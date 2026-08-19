Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
appDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = appDir

Dim url
url = "http://localhost:3000"

' Check if server already running
Dim alreadyRunning
alreadyRunning = False
On Error Resume Next
Dim httpCheck
Set httpCheck = CreateObject("MSXML2.XMLHTTP")
httpCheck.Open "GET", "http://localhost:3000/healthz", False
httpCheck.Send
If httpCheck.Status = 200 Then alreadyRunning = True
On Error GoTo 0

If Not alreadyRunning Then
    ' Start server completely hidden (no CMD window)
    WshShell.Run "node backend/server.js", 0, False
    WScript.Sleep 2000
End If

' Open in Edge app mode (looks like native app)
Dim edgePath
edgePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles(x86)%") & "\Microsoft\Edge\Application\msedge.exe"
If fso.FileExists(edgePath) Then
    WshShell.Run """" & edgePath & """ --app=" & url & " --window-size=1200,800 --window-name=AR_ChatBot --disable-features=TranslateUI", 1, False
    WScript.Quit
End If

Dim chromePath
chromePath = WshShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\Google\Chrome\Application\chrome.exe"
If fso.FileExists(chromePath) Then
    WshShell.Run """" & chromePath & """ --app=" & url & " --window-size=1200,800 --window-name=AR_ChatBot", 1, False
    WScript.Quit
End If

WshShell.Run url, 1, False
