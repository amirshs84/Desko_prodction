# دانلود وابستگی‌های اندروید به local-maven (برای اینترنت محدود)
# اجرا از پوشه android:
#   cd frontend\android
#   powershell -ExecutionPolicy Bypass -File .\scripts\download-offline-deps.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$localMaven = Join-Path $root "local-maven"

$mirrors = @(
    "https://maven.aliyun.com/repository/google",
    "https://repo.huaweicloud.com/repository/maven",
    "https://dl.google.com/dl/android/maven2"
)

function Download-MavenFile {
    param(
        [string]$GroupPath,
        [string]$Version,
        [string]$FileName
    )

    $destDir = Join-Path $localMaven (Join-Path $GroupPath $Version)
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $dest = Join-Path $destDir $FileName
    if (Test-Path $dest) {
        Write-Host "  skip (exists): $FileName"
        return
    }

    foreach ($mirror in $mirrors) {
        $url = "$mirror/$GroupPath/$Version/$FileName"
        try {
            Write-Host "  try: $url"
            Invoke-WebRequest -Uri $url -OutFile $dest -UseBasicParsing -TimeoutSec 90
            if ((Get-Item $dest).Length -gt 0) {
                Write-Host "  ok: $FileName"
                return
            }
        } catch {
            Remove-Item $dest -ErrorAction SilentlyContinue
        }
    }
    Write-Warning "  FAILED: $FileName - download manually to $destDir"
}

function Download-MavenArtifact {
    param(
        [string]$GroupPath,
        [string]$Version,
        [string]$ArtifactId
    )

    foreach ($ext in @("pom", "aar", "jar")) {
        Download-MavenFile -GroupPath $GroupPath -Version $Version -FileName "$ArtifactId-$Version.$ext"
    }
}

Write-Host "=== local-maven: $localMaven ===" -ForegroundColor Cyan

# aapt2 ویندوز — خطای CompileLibraryResources
Download-MavenFile -GroupPath "com/android/tools/build/aapt2" -Version "8.13.0-13719691" -FileName "aapt2-8.13.0-13719691.pom"
Download-MavenFile -GroupPath "com/android/tools/build/aapt2" -Version "8.13.0-13719691" -FileName "aapt2-8.13.0-13719691-windows.jar"

Download-MavenArtifact -GroupPath "androidx/activity/activity-ktx" -Version "1.11.0" -ArtifactId "activity-ktx"
Download-MavenArtifact -GroupPath "androidx/activity/activity"       -Version "1.11.0" -ArtifactId "activity"
Download-MavenArtifact -GroupPath "androidx/lifecycle/lifecycle-runtime-ktx"   -Version "2.6.1" -ArtifactId "lifecycle-runtime-ktx"
Download-MavenArtifact -GroupPath "androidx/lifecycle/lifecycle-viewmodel-ktx" -Version "2.6.1" -ArtifactId "lifecycle-viewmodel-ktx"
Download-MavenArtifact -GroupPath "androidx/savedstate/savedstate-ktx"         -Version "1.2.1" -ArtifactId "savedstate-ktx"

Write-Host ""
Write-Host "Done. If Gradle asks for another library, add it to this script." -ForegroundColor Green
