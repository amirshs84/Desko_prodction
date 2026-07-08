# Opens download helper page in Google Chrome (use with VPN extension enabled in Chrome)
$html = Join-Path (Split-Path -Parent $PSScriptRoot) "local-maven\download-in-chrome.html"
$uri = [System.Uri]::new($html).AbsoluteUri

$chromePaths = @(
  "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)

$chrome = $chromePaths | Where-Object { Test-Path $_ } | Select-Object -First 1
if ($chrome) {
  Start-Process -FilePath $chrome -ArgumentList $uri
  Write-Host "Opened in Chrome: $uri"
} else {
  Start-Process $uri
  Write-Host "Chrome not found; opened with default browser: $uri"
}
