# Serves this folder on http://localhost:5500 without Python.
param([int]$Port = 5500)

$root = $PSScriptRoot
if (-not $root) { $root = Get-Location }
$index = Join-Path $root "index.html"
if (-not (Test-Path $index)) {
    Write-Host "index.html not found. Run this from the attendance folder inside the cloned repo."
    exit 1
}

$listener = New-Object System.Net.HttpListener
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Write-Host "Could not bind port $Port. Opening the HTML file instead."
    Start-Process $index
    exit 0
}

Start-Process $prefix
Write-Host "Attendance app is running at $prefix"
Write-Host "Leave this window open. Press Ctrl+C to stop."

$mime = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".js"   = "text/javascript; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".json" = "application/json"
    ".csv"  = "text/csv; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        $ctx = $listener.GetContext()
        $path = [Uri]::UnescapeDataString($ctx.Request.Url.LocalPath)
        if ($path -eq "/" -or $path -eq "") { $path = "/index.html" }
        $rel = $path.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
        $file = [IO.Path]::GetFullPath((Join-Path $root $rel))
        $rootFull = [IO.Path]::GetFullPath($root)
        if (-not $file.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path $file) -or (Get-Item $file).PSIsContainer) {
            $ctx.Response.StatusCode = 404
            $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
            $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
            $ctx.Response.Close()
            continue
        }
        $ext = [IO.Path]::GetExtension($file).ToLowerInvariant()
        $ctx.Response.ContentType = $(if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" })
        $bytes = [IO.File]::ReadAllBytes($file)
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $ctx.Response.Close()
    }
} finally {
    $listener.Stop()
}
