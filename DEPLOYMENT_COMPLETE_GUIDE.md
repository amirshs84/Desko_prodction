# 🚀 راهنمای کامل راه‌اندازی و دیپلوی

## 📋 معرفی سیستم

این پروژه یک **پلتفرم SaaS** برای مدیریت زمان مطالعه دانش‌آموزان است که شامل ۳ سطح کاربری می‌باشد:

1. **دانش‌آموز (Student)**: استفاده از تایمر، مشاهده داشبورد شخصی، مدیریت درس‌ها
2. **مدیر (Manager)**: مشاهده عملکرد تمام دانش‌آموزان مدرسه، خروجی Excel، مدیریت بر مبنای استثنا
3. **سوپرادمین (SuperAdmin)**: ساخت مدارس جدید، تعیین مدیر برای هر مدرسه، مدیریت invitation code

---

## 🏗️ معماری سیستم (Multi-Tenancy)

### مدل‌های دیتابیس:
- **School**: نمایانگر هر مدرسه با `invitation_code` منحصربه‌فرد
- **UserProfile**: پروفایل کاربران با فیلد `school` و `role` و `is_superadmin`
- **StudySession**: جلسات مطالعه که به کاربر متصل است
- **Subject**: درس‌ها (مشترک بین همه)

### نحوه جداسازی:
- هر دانش‌آموز فقط به داده‌های خودش دسترسی دارد
- هر مدیر فقط به دانش‌آموزان مدرسه خودش دسترسی دارد
- سوپرادمین به همه مدارس دسترسی دارد

---

## 🎯 مراحل دیپلوی روی سرور (VPS)

### قدم ۱: آماده‌سازی کد برای دیپلوی

#### الف) آپدیت تنظیمات Django:
فایل `.env` شما باید شامل این موارد باشد:
```env
SECRET_KEY=django-insecure-auto-gen-super-secret-key-x8!2@9#1env
DEBUG=False
ALLOWED_HOSTS=185.252.86.221,localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://185.252.86.221
CSRF_TRUSTED_ORIGINS=http://185.252.86.221

# Database Settings
DB_NAME=timer_db
DB_USER=timer_user
DB_PASSWORD=Strong_DB_Pass_2024_Ex
DB_HOST=db
DB_PORT=5432

# Manual DATABASE_URL to avoid parsing issues
DATABASE_URL=postgres://timer_user:Strong_DB_Pass_2024_Ex@db:5432/timer_db

# Frontend Settings
VITE_API_URL=http://185.252.86.221/api/
```

#### ب) Push کدها به GitHub:
```bash
git add .
git commit -m "feat: add multi-tenancy system with superadmin panel and modern UI"
git push origin main
```

### قدم ۲: دیپلوی روی سرور

#### الف) Pull کردن کدهای جدید:
```bash
cd ~/timers
git pull origin main
```

#### ب) Build و راه‌اندازی مجدد:
```bash
docker-compose down
docker-compose up -d --build
```

#### ج) اعمال Migration ها:
```bash
docker-compose exec backend python manage.py makemigrations
docker-compose exec backend python manage.py migrate
```

#### د) نصب کتابخانه‌های جدید:
```bash
docker-compose exec backend pip install openpyxl
```

### قدم ۳: ساخت سوپرادمین اولیه

برای دسترسی اولیه به پنل سوپرادمین، باید یک کاربر را به عنوان superadmin تعریف کنید:

```bash
docker-compose exec backend python manage.py shell
```

سپس در Python Shell:
```python
from django.contrib.auth.models import User
from api.models import UserProfile

# شماره تلفن خودتان (شماره سوپرادمین)
phone = "09123456789"

# ساخت یا دریافت کاربر
user, created = User.objects.get_or_create(username=phone)
profile, _ = UserProfile.objects.get_or_create(
    user=user,
    defaults={'phone_number': phone}
)

# تبدیل به سوپرادمین
profile.is_superadmin = True
profile.full_name = "ادمین اصلی"
profile.is_profile_complete = True
profile.save()

print(f"✅ {profile.full_name} به سوپرادمین تبدیل شد")
exit()
```

---

## 🎓 نحوه استفاده از سیستم

### ۱. به عنوان سوپرادمین:

#### الف) ورود:
1. وارد `http://your-ip/login` شوید
2. شماره سوپرادمین را وارد کنید
3. کد `12345` را بزنید
4. به `/superadmin` منتقل می‌شوید

#### ب) ساخت مدرسه جدید:
1. روی دکمه **"افزودن مدرسه جدید"** کلیک کنید
2. نام مدرسه را وارد کنید (مثلاً: "دبیرستان فرزانگان")
3. حد نرمال مطالعه را تعیین کنید (پیش‌فرض ۶ ساعت)
4. روی "ایجاد" کلیک کنید
5. **کد دعوت** به صورت خودکار ساخته می‌شود (مثلاً `ABC12XYZ`)

#### ج) تعیین مدیر برای مدرسه:
1. روی دکمه **"تعیین مدیر"** در کارت مدرسه کلیک کنید
2. شماره تلفن مدیر را وارد کنید
3. روی "تعیین" کلیک کنید
4. اگر کاربر وجود نداشته باشد، به صورت خودکار ساخته می‌شود

### ۲. به عنوان مدیر مدرسه:

#### الف) ورود اولیه:
1. سوپرادمین شماره شما را به عنوان مدیر تعیین می‌کند
2. شما وارد `/login` می‌شوید
3. شماره تلفن خود را وارد می‌کنید
4. کد `12345` را می‌زنید
5. به `/manager` منتقل می‌شوید (پنل مدیریت)

#### ب) مشاهده عملکرد:
- **KPI Cards**: میانگین مطالعه، فعال‌ترین دانش‌آموز، غایبین، فعال الان
- **جدول دانش‌آموزان**: لیست با آواتار، trend indicator، و رنگ‌بندی بر اساس عملکرد
- **فیلتر**: جستجو، پایه، رشته المپیاد
- **Export Excel**: دانلود گزارش ۳۰ روز اخیر

#### ج) مشاهده پروفایل دانش‌آموز:
- کلیک روی هر ردیف → مشاهده آمار تفصیلی آن دانش‌آموز

### ۳. به عنوان دانش‌آموز:

#### الف) ثبت‌نام:
1. وارد `/login` شوید
2. شماره تلفن را وارد کنید
3. کد `12345` را بزنید
4. در مرحله تکمیل پروفایل:
   - نام و نام خانوادگی
   - پایه تحصیلی
   - رشته المپیاد
   - **کد دعوت مدرسه** (از مدیر دریافت کنید)
5. به `/timer` منتقل می‌شوید

#### ب) استفاده از تایمر:
- شروع تایمر، ثبت جلسه، مشاهده داشبورد، اضافه کردن درس

---

## 🎨 ویژگی‌های طراحی مدرن

### KPI Cards:
- ✅ **Glassmorphism**: پس‌زمینه‌های نیمه‌شفاف با بلور
- ✅ **Gradient های ملایم**: استفاده از رنگ‌های تدریجی
- ✅ **آیکون‌های React Icons**: بجای ایموجی‌های ساده
- ✅ **Hover Effects**: تغییر مقیاس و سایه هنگام هوور
- ✅ **Trend Badges**: نشانگرهای رنگی با درصد تغییر

### جدول دانش‌آموزان:
- ✅ **آواتار شخصی**: دایره‌های رنگی با حروف اول نام
- ✅ **Zebra Striping**: رنگ‌بندی ملایم ردیف‌ها
- ✅ **رنگ بر اساس عملکرد**: قرمز (کمتر از ۳ ساعت)، زرد (۳-۶ ساعت)
- ✅ **بج‌های وضعیت**: کپسول‌های رنگی با آیکون
- ✅ **Hover Transform**: بزرگ‌نمایی ملایم هنگام هوور

---

## 🔧 تنظیمات پیشرفته

### تغییر حد نرمال مطالعه:
در پنل سوپرادمین، هنگام ساخت مدرسه می‌توانید حد نرمال را تنظیم کنید. این عدد بر رنگ‌بندی جدول تأثیر می‌گذارد.

### اضافه کردن سوپرادمین جدید:
```bash
docker-compose exec backend python manage.py shell
```
```python
from api.models import UserProfile
profile = UserProfile.objects.get(phone_number="09xxxxxxxxx")
profile.is_superadmin = True
profile.save()
exit()
```

---

## 📊 جریان کامل (Flow)

```
1️⃣ SuperAdmin:
   ├─ ورود به /superadmin
   ├─ ساخت مدرسه → تولید invitation_code
   ├─ تعیین مدیر برای مدرسه (با شماره تلفن)
   └─ ارسال invitation_code به مدیر

2️⃣ Manager:
   ├─ ورود به /login
   ├─ redirect خودکار به /manager
   ├─ ارسال invitation_code به دانش‌آموزان
   └─ مشاهده عملکرد دانش‌آموزان مدرسه خود

3️⃣ Student:
   ├─ ورود به /login
   ├─ تکمیل پروفایل + وارد کردن invitation_code
   ├─ عضویت در مدرسه
   └─ استفاده از تایمر و داشبورد
```

---

## 🐛 رفع مشکلات رایج

### ۱. خطای "کد دعوت نامعتبر است"
- مطمئن شوید که invitation_code را صحیح وارد کرده‌اید (۸ کاراکتر، حروف بزرگ)
- بررسی کنید که مدرسه `is_active=True` باشد

### ۲. مدیر دانش‌آموزان را نمی‌بیند
- مطمئن شوید که مدیر به مدرسه متصل است (`school` نباید null باشد)
- بررسی کنید که دانش‌آموزان `invitation_code` درست را وارد کرده باشند

### ۳. Excel Export خطا می‌دهد
- نصب `openpyxl`:
  ```bash
  docker-compose exec backend pip install openpyxl
  docker-compose restart backend
  ```

### ۴. Migration ها اعمال نمی‌شوند
- حذف کامل دیتابیس و شروع مجدد:
  ```bash
  docker-compose down -v
  docker-compose up -d
  docker-compose exec backend python manage.py migrate
  ```

---

## 🔐 امنیت

### نکات امنیتی مهم:
1. ✅ `DEBUG=False` در production
2. ✅ `ALLOWED_HOSTS` محدود به دامنه/IP سرور
3. ✅ `CORS_ALLOWED_ORIGINS` محدود به دامنه فرانت‌اند
4. ⚠️ سیستم OTP فعلاً mock است (کد ثابت `12345`) - در production باید با SMS واقعی جایگزین شود
5. ✅ JWT Token ها با زمان انقضای ۷ روز (access) و ۳۰ روز (refresh)

---

## 📱 تجربه کاربری مدرن

### ویژگی‌های UI/UX:
- 🎨 **Glassmorphism**: پس‌زمینه‌های نیمه‌شفاف با بلور
- 🌈 **Gradient های پویا**: رنگ‌های تدریجی زیبا در header و cards
- 💎 **آواتار شخصی**: دایره‌های رنگی برای هر دانش‌آموز
- 📊 **Trend Indicators**: فلش‌های رنگی برای نمایش روند
- 🎯 **رنگ‌بندی هوشمند**: قرمز/زرد/سفید بر اساس عملکرد
- 🔄 **Micro-interactions**: تغییر مقیاس و سایه هنگام hover
- 📱 **کاملاً Responsive**: موبایل، تبلت، دسکتاپ

---

## 📦 فایل‌های جدید و تغییرات

### بک‌اند (Django):
**فایل‌های جدید:**
- `api/permissions.py` (IsManager, IsSuperAdmin)

**فایل‌های تغییر یافته:**
- `api/models.py`: اضافه شدن School model + فیلدهای school, is_superadmin
- `api/serializers.py`: ۴ serializer جدید (School, Manager Student List, Manager KPI, Assign Manager)
- `api/views.py`: ۹ view جدید (Manager: 5, SuperAdmin: 4)
- `api/urls.py`: ۹ endpoint جدید
- `requirements.txt`: اضافه شدن openpyxl

### فرانت‌اند (React):
**فایل‌های جدید:**
- `frontend/src/pages/manager/ManagerDashboard.jsx` (بازطراحی شده)
- `frontend/src/pages/manager/StudentProfile.jsx`
- `frontend/src/pages/superadmin/SuperAdminDashboard.jsx`
- `frontend/src/components/manager/KPICard.jsx` (بازطراحی شده با Glassmorphism)
- `frontend/src/components/manager/TrendIndicator.jsx` (با آیکون‌های React Icons)

**فایل‌های تغییر یافته:**
- `frontend/src/App.jsx`: Route های SuperAdmin و Manager
- `frontend/src/pages/Login.jsx`: فیلد invitation_code + redirect بر اساس role
- `frontend/src/api/client.js`: superadminAPI و managerAPI
- `frontend/package.json`: اضافه شدن react-icons

---

## 🎯 سناریوی کامل استفاده

### روز ۱: راه‌اندازی اولیه توسط شما (صاحب محصول)
1. سرور را راه‌اندازی کنید
2. خودتان را به عنوان SuperAdmin تعریف کنید

### روز ۲: فروش به مدرسه اول
1. ورود به پنل SuperAdmin
2. ساخت مدرسه "دبیرستان فرزانگان"
3. تولید خودکار کد: `FRZ48ABC`
4. تعیین مدیر (شماره: `09121234567`)
5. ارسال اطلاعات به مدیر

### روز ۳: مدیر شروع به کار می‌کند
1. مدیر با شماره خود login می‌کند
2. به پنل `/manager` می‌رود
3. کد دعوت (`FRZ48ABC`) را به دانش‌آموزان می‌دهد

### روز ۴: دانش‌آموزان ثبت‌نام می‌کنند
1. دانش‌آموز login می‌کند
2. در فرم ثبت‌نام، کد `FRZ48ABC` را وارد می‌کند
3. به صورت خودکار به مدرسه فرزانگان متصل می‌شود
4. مدیر او را در پنل خود می‌بیند

---

## 🔄 CI/CD با GitHub Actions

بعد از هر `git push` به branch `main`:
1. GitHub Actions فعال می‌شود
2. به سرور SSH می‌زند
3. کدهای جدید را `git pull` می‌کند
4. Docker images را rebuild می‌کند
5. Migration ها را اجرا می‌کند
6. Static files را جمع‌آوری می‌کند

**نکته**: برای فعال‌سازی CI/CD، باید Secrets را در GitHub تنظیم کنید (مطابق فایل `.github/workflows/deploy.yml`).

---

## 📞 پشتیبانی و توسعه

برای افزودن ویژگی‌های جدید یا رفع مشکلات، به مستندات فنی مراجعه کنید:
- `MANAGER_PANEL_GUIDE.md`: راهنمای پنل مدیریت
- `MANAGER_PANEL_IMPLEMENTATION.md`: جزئیات فنی پیاده‌سازی

---

## ✨ خلاصه

شما الان یک **پلتفرم SaaS کامل** دارید که:
- ✅ قابل فروش به چندین مدرسه است
- ✅ هر مدرسه مدیر و دانش‌آموزان مجزای خود را دارد
- ✅ با طراحی مدرن و حرفه‌ای
- ✅ Export Excel برای گزارش‌گیری
- ✅ CI/CD خودکار با GitHub
- ✅ Docker برای مدیریت آسان
- ✅ PostgreSQL برای production

**🚀 محصول آماده عرضه به بازار است!**
