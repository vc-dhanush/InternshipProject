param(
  [int]$Port = 5500
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$listener = [System.Net.HttpListener]::new()
$prefix = "http://127.0.0.1:$Port/"
$listener.Prefixes.Add($prefix)
try {
  $listener.Start()
} catch {
  Write-Host "Could not bind $prefix"
  Write-Host $_
  exit 1
}

Write-Host "SkyVault Attendance is running at $prefix"
Write-Host "Press Ctrl+C to stop."
Start-Process $prefix

$mime = @{
  ".html" = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".ico"  = "image/x-icon"
  ".txt"  = "text/plain; charset=utf-8"
}

function Get-SafePath([string]$urlPath) {
  $rel = [Uri]::UnescapeDataString($urlPath.TrimStart("/"))
  if ([string]::IsNullOrWhiteSpace($rel)) { $rel = "index.html" }
  $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
  $rootFull = [System.IO.Path]::GetFullPath($root)
  if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase)) {
    return $null
  }
  return $full
}

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response
    try {
      $path = Get-SafePath $req.Url.AbsolutePath
      if (-not $path) {
        $res.StatusCode = 403
        $bytes = [Text.Encoding]::UTF8.GetBytes("Forbidden")
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        continue
      }
      if (Test-Path $path -PathType Container) {
        $path = Join-Path $path "index.html"
      }
      if (-not (Test-Path $path -PathType Leaf)) {
        $res.StatusCode = 404
        $bytes = [Text.Encoding]::UTF8.GetBytes("Not found")
        $res.OutputStream.Write($bytes, 0, $bytes.Length)
        continue
      }
      $ext = [IO.Path]::GetExtension($path).ToLowerInvariant()
      $res.ContentType = if ($mime.ContainsKey($ext)) { $mime[$ext] } else { "application/octet-stream" }
      $bytes = [IO.File]::ReadAllBytes($path)
      $res.ContentLength64 = $bytes.Length
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.OutputStream.Close()
    }
  }
} finally {
  $listener.Stop()
  $listener.Close()
}
