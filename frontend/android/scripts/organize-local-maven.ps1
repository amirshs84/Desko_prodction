# Moves flat downloads into Maven repo layout under local-maven
$base = Join-Path (Split-Path -Parent $PSScriptRoot) "local-maven"

$map = @{
    "core-ktx-1.17.0" = "androidx/core/core-ktx/1.17.0"
    "core-1.17.0" = "androidx/core/core/1.17.0"
    "core-splashscreen-1.2.0" = "androidx/core/core-splashscreen/1.2.0"
    "core-viewtree-1.0.0" = "androidx/core/core-viewtree/1.0.0"
    "appcompat-1.7.1" = "androidx/appcompat/appcompat/1.7.1"
    "appcompat-resources-1.7.1" = "androidx/appcompat/appcompat-resources/1.7.1"
    "fragment-1.8.9" = "androidx/fragment/fragment/1.8.9"
    "coordinatorlayout-1.3.0" = "androidx/coordinatorlayout/coordinatorlayout/1.3.0"
    "webkit-1.14.0" = "androidx/webkit/webkit/1.14.0"
    "savedstate-1.2.1" = "androidx/savedstate/savedstate/1.2.1"
    "profileinstaller-1.4.0" = "androidx/profileinstaller/profileinstaller/1.4.0"
    "annotation-1.8.2" = "androidx/annotation/annotation/1.8.2"
    "annotation-experimental-1.4.1" = "androidx/annotation/annotation-experimental/1.4.1"
    "collection-1.4.2" = "androidx/collection/collection/1.4.2"
    "concurrent-futures-1.1.0" = "androidx/concurrent/concurrent-futures/1.1.0"
    "cursoradapter-1.0.0" = "androidx/cursoradapter/cursoradapter/1.0.0"
    "customview-1.1.0" = "androidx/customview/customview/1.1.0"
    "customview-poolingcontainer-1.0.0" = "androidx/customview/customview-poolingcontainer/1.0.0"
    "drawerlayout-1.2.0" = "androidx/drawerlayout/drawerlayout/1.2.0"
    "emoji2-1.3.0" = "androidx/emoji2/emoji2/1.3.0"
    "emoji2-views-helper-1.3.0" = "androidx/emoji2/emoji2-views-helper/1.3.0"
    "interpolator-1.0.0" = "androidx/interpolator/interpolator/1.0.0"
    "loader-1.0.0" = "androidx/loader/loader/1.0.0"
    "resourceinspection-annotation-1.0.1" = "androidx/resourceinspection/resourceinspection-annotation/1.0.1"
    "startup-runtime-1.1.1" = "androidx/startup/startup-runtime/1.1.1"
    "tracing-1.2.0" = "androidx/tracing/tracing/1.2.0"
    "vectordrawable-1.1.0" = "androidx/vectordrawable/vectordrawable/1.1.0"
    "vectordrawable-animated-1.1.0" = "androidx/vectordrawable/vectordrawable-animated/1.1.0"
    "versionedparcelable-1.1.1" = "androidx/versionedparcelable/versionedparcelable/1.1.1"
    "viewpager-1.0.0" = "androidx/viewpager/viewpager/1.0.0"
    "lifecycle-common-2.6.2" = "androidx/lifecycle/lifecycle-common/2.6.2"
    "lifecycle-runtime-2.6.2" = "androidx/lifecycle/lifecycle-runtime/2.6.2"
    "lifecycle-viewmodel-2.6.2" = "androidx/lifecycle/lifecycle-viewmodel/2.6.2"
    "lifecycle-livedata-2.6.2" = "androidx/lifecycle/lifecycle-livedata/2.6.2"
    "lifecycle-livedata-core-2.6.2" = "androidx/lifecycle/lifecycle-livedata-core/2.6.2"
    "lifecycle-process-2.6.2" = "androidx/lifecycle/lifecycle-process/2.6.2"
    "lifecycle-viewmodel-savedstate-2.6.2" = "androidx/lifecycle/lifecycle-viewmodel-savedstate/2.6.2"
    "framework-14.0.1" = "org/apache/cordova/framework/14.0.1"
    "ionfilesystem-android-1.1.0" = "io/ionic/libs/ionfilesystem-android/1.1.0"
    "core-runtime-2.2.0" = "androidx/arch/core/core-runtime/2.2.0"
    "core-common-2.2.0" = "androidx/arch/core/core-common/2.2.0"
}

$moved = 0
Get-ChildItem $base -File | ForEach-Object {
    $name = $_.BaseName
    if ($name -match ' \(\d+\)$') { $name = $name -replace ' \(\d+\)$', '' }
    if (-not $map.ContainsKey($name)) {
        Write-Warning "No mapping for: $($_.Name)"
        return
    }
    $destDir = Join-Path $base $map[$name]
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
    $dest = Join-Path $destDir $_.Name
    if ($_.FullName -ne $dest) {
        Move-Item -Force $_.FullName $dest
        $moved++
        Write-Host "OK $name -> $($map[$name])"
    }
}

Write-Host "Moved $moved files."
