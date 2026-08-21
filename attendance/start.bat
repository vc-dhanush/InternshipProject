@echo off
setlocal
cd /d "%~dp0"
set PORT=5500
echo Attendance dashboard - http://localhost:%PORT%/
where python >nul 2>nul
if %ERRORLEVEL%==0 (
  python -m http.server %PORT%
  goto :eof
)
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 -m http.server %PORT%
  goto :eof
)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=5500; $root=(Get-Location).Path; $l=[System.Net.HttpListener]::new(); $l.Prefixes.Add('http://localhost:'+$p+'/'); $l.Start(); Write-Host ('Open http://localhost:'+$p+'/'); Start-Process ('http://localhost:'+$p+'/'); while($l.IsListening){ $c=$l.GetContext(); $req=$c.Request.Url.LocalPath; if($req -eq '/'){ $req='/index.html' }; $path=Join-Path $root ($req.TrimStart('/')); if(-not (Test-Path $path)){ $c.Response.StatusCode=404; $c.Response.Close(); continue }; $bytes=[IO.File]::ReadAllBytes($path); $ext=[IO.Path]::GetExtension($path).ToLower(); $c.Response.ContentType=@{'.html'='text/html';'.css'='text/css';'.js'='application/javascript';'.json'='application/json';'.csv'='text/csv'}[$ext]; if(-not $c.Response.ContentType){$c.Response.ContentType='application/octet-stream'}; $c.Response.OutputStream.Write($bytes,0,$bytes.Length); $c.Response.Close() }"
