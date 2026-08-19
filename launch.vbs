Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = WshShell.ExpandEnvironmentStrings("%~dp0")
WshShell.Run "cmd /c cd /d """ & WshShell.CurrentDirectory & """ && start.bat", 0, False
WScript.Sleep 3000
WshShell.Run "http://localhost:3000", 1, False
