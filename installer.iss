[Setup]
AppId={{AR-CHATBOT-2026-0001}
AppName=AR_ChatBot
AppVersion=1.1.0
AppPublisher=AR_ChatBot
DefaultDirName={localappdata}\AR_ChatBot
DefaultGroupName=AR_ChatBot
OutputDir=D:\AR_ChatBot\dist
OutputBaseFilename=AR_ChatBot_Setup
Compression=lzma2
SolidCompression=yes
PrivilegesRequired=lowest
DisableProgramGroupPage=yes
DisableDirPage=no
UninstallDisplayIcon={app}\ar_chatbot.ico
SetupIconFile=D:\AR_ChatBot\dist\ar_chatbot.ico
WizardStyle=modern

[InstallDelete]
Type: files; Name: "{userdesktop}\AR_ChatBot.lnk"

[Files]
Source: "D:\AR_ChatBot\backend\server.js"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "D:\AR_ChatBot\backend\src\*"; DestDir: "{app}\backend\src"; Flags: recursesubdirs
Source: "D:\AR_ChatBot\backend\public\*"; DestDir: "{app}\backend\public"; Flags: recursesubdirs ignoreversion
Source: "D:\AR_ChatBot\backend\data\config.json"; DestDir: "{app}\backend\data"; Flags: ignoreversion
Source: "D:\AR_ChatBot\backend\package.json"; DestDir: "{app}\backend"; Flags: ignoreversion
Source: "D:\AR_ChatBot\app\build\web\*"; DestDir: "{app}\web"; Flags: recursesubdirs
Source: "D:\AR_ChatBot\widget\*"; DestDir: "{app}\widget"; Flags: recursesubdirs
Source: "D:\AR_ChatBot\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\AR_ChatBot\launch.vbs"; DestDir: "{app}"; Flags: ignoreversion
Source: "D:\AR_ChatBot\dist\ar_chatbot.ico"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\AR_ChatBot"; Filename: "{app}\start.bat"; WorkingDir: "{app}"; IconFilename: "{app}\ar_chatbot.ico"
Name: "{group}\Uninstall AR_ChatBot"; Filename: "{uninstallexe}"
Name: "{userdesktop}\AR_ChatBot"; Filename: "{app}\launch.vbs"; WorkingDir: "{app}"; IconFilename: "{app}\ar_chatbot.ico"; Tasks: desktopicon

[Tasks]
Name: "desktopicon"; Description: "Create desktop shortcut"; GroupDescription: "Additional icons:"; Flags: checkedonce

[Run]
