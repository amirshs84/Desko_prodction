# کتابخانه‌های آفلاین (local-maven)

Gradle اول این پوشه را می‌خواند، بعد آینه علی‌بابا، بعد google.

## ساختار درست (مثال activity-ktx)

```
local-maven/
  androidx/
    activity/
      activity-ktx/
        1.11.0/
          activity-ktx-1.11.0.pom   ← دارید
          activity-ktx-1.11.0.aar   ← حتماً لازم است (فقط pom کافی نیست)
      activity/
        1.11.0/
          activity-1.11.0.pom
          activity-1.11.0.aar
```

## روش ۱ — اسکریپت (اگر کمی اینترنت دارید)

```powershell
cd frontend\android
powershell -ExecutionPolicy Bypass -File .\scripts\download-offline-deps.ps1
```

## روش ۲ — دانلود دستی با مرورگر / گوشی

فایل‌ها را از یکی از این آدرس‌ها بگیرید و در مسیر بالا کپی کنید:

- `https://dl.google.com/dl/android/maven2/androidx/activity/activity-ktx/1.11.0/activity-ktx-1.11.0.aar`
- `https://dl.google.com/dl/android/maven2/androidx/activity/activity/1.11.0/activity-1.11.0.aar`

یا آینه:

- `https://maven.aliyun.com/repository/google/androidx/activity/activity-ktx/1.11.0/activity-ktx-1.11.0.aar`

## بعد از کپی فایل‌ها

```powershell
cd frontend\android
.\gradlew.bat assembleRelease --refresh-dependencies
```

اگر باز هم `Could not find ...` دیدید، همان نام کتابخانه را در لاگ پیدا کنید و همان مسیر Maven را پر کنید.
