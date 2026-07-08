# دانلود وابستگی‌های اندروید به local-maven (برای اینترنت محدود)
# اجرا از پوشه android:
#   cd frontend\android
#   powershell -ExecutionPolicy Bypass -File .\scripts\download-offline-deps.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$localMaven = Join-Path $root "local-maven"

# آینه علی‌بابا — اگر کار نکرد، با VPN یا شبکه دیگر اجرا کنید
$mirrors = @(
    "https://maven.aliyun.com/repository/google",
    "https://dl.google.com/dl/android/maven2"
)

function Download-MavenArtifact {
    param(
        [string]$GroupPath,   # مثال: androidx/activity/activity-ktx
        [string]$Version,
        [string]$ArtifactId
    )

    $destDir = Join-Path $localMaven (Join-Path $GroupPath $Version)
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null

    foreach ($ext in @("pom", "aar", "jar")) {
        $fileName = "$ArtifactId-$Version.$ext"
        $dest = Join-Path $destDir $fileName
        if (Test-Path $dest) {
            Write-Host "  skip (exists): $fileName"
            continue
        }

        $downloaded = $false
        foreach ($mirror in $mirrors) {
            $url = "$mirror/$GroupPath/$Version/$fileName"
            try {
                Write-Host "  try: $url"
                Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 60
                if ((Get-Item $dest).Length -gt 0) {
                    Write-Host "  ok: $fileName"
                    $downloaded = $true
                    break
                }
            } catch {
                Remove-Item $dest -ErrorAction SilentlyContinue
            }
        }
        if (-not $downloaded -and $ext -eq "aar") {
            Write-Warning "  FAILED: $fileName - download manually to $destDir"
        }
    }
}

Write-Host "=== local-maven: $localMaven ===" -ForegroundColor Cyan

# حداقل برای خطای فعلی شما
Download-MavenArtifact -GroupPath "androidx/activity/activity-ktx" -Version "1.11.0" -ArtifactId "activity-ktx"
Download-MavenArtifact -GroupPath "androidx/activity/activity"       -Version "1.11.0" -ArtifactId "activity"

# وابستگی‌های مستقیم activity-ktx (از pom)
Download-MavenArtifact -GroupPath "androidx/lifecycle/lifecycle-runtime-ktx"   -Version "2.6.1" -ArtifactId "lifecycle-runtime-ktx"
Download-MavenArtifact -GroupPath "androidx/lifecycle/lifecycle-viewmodel-ktx" -Version "2.6.1" -ArtifactId "lifecycle-viewmodel-ktx"
Download-MavenArtifact -GroupPath "androidx/savedstate/savedstate-ktx"         -Version "1.2.1" -ArtifactId "savedstate-ktx"

Write-Host ""
Write-Host "Done. If Gradle asks for another library, add it to this script." -ForegroundColor Green
