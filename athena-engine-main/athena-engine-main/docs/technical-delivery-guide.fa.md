# راهنمای فنی تکمیل Athena Engine

**مخاطب:** توسعه‌دهندهٔ مسئول Athena  
**نویسنده:** از منظر Software Engineer ارشد / مالک فنی یکپارچه‌سازی با Desko  
**وضعیت سند:** توافق‌شده برای فاز تحویل فعلی — تصمیم‌های باز را قبل از شروع کد فریز کنید  
**نسخهٔ موتور:** `0.1.0`

---

## ۱. هدف این سند

دامنهٔ اصلی Athena تا حد خوبی پیاده شده است. کار باقی‌مانده عمدتاً لایهٔ تحویل است، نه بازطراحی مدل ذهنی آزمون.

این سند مشخص می‌کند:

1. Athena دقیقاً چه مسئولیتی دارد و چه چیزی را عمداً **نمی‌پذیرد**
2. تصمیم‌های معماری که دیگر نباید باز بمانند
3. ترتیب کار (بک‌لاگ فازبندی‌شده)
4. قرارداد اولیهٔ API برای فاز ۱
5. نگاشت خطاهای دامنه به HTTP
6. نقش Worker و اینکه Logging کی وارد می‌شود

اگر چیزی در این سند با برداشت قبلی‌ات فرق دارد، قبل از کد زدن همان را escalate کن — نه وسط پیاده‌سازی.

---

## ۲. وضعیت فعلی (واقع‌بینانه)

### آنچه آماده است

- Aggregateهای دامنه با state machine:
  - `Problem`
  - `Exam` / `ExamProblem`
  - `ExamSession` / `ExamSessionProblem` / `SessionParticipant`
  - `SessionAttempt` / `Answer` + `GradingDomainService`
- الگوی Repository + Unit of Work (`AsyncSqlAlchemyUoW`)
- Application Serviceهای کلیدی:
  - `CreateExamSessionService`
  - `AddParticipantService` / `RemoveParticipantService`
  - `StartAttemptService`
  - `SendAnswerService`
  - `SubmitAttemptService`
- جداسازی payload عمومی / خصوصی سؤال (MCQ)
- Snapshot محتوای سؤال روی `ExamSession` تا ویرایش بعدی بانک سؤال جلسه را خراب نکند

### آنچه هنوز وجود ندارد

- FastAPI app و Routerها
- Alembic migration واقعی
- Query/Read modelهای کامل برای پاسخ‌های HTTP
- Exception mapper مرکزی به HTTP
- Worker همگام‌سازی وضعیت جلسه
- Logging ساخت‌یافته
- یکپارچگی با `docker-compose` دسکو
- تست‌های یکپارچه روی مسیر دانش‌آموز

**نتیجه:** Athena الان یک domain/application library بالغِ نیمه‌کاره است، نه یک سرویس قابل استقرار.

---

## ۳. مرز سیستم نسبت به Desko

```
┌─────────────────────────────────────────────┐
│ Desko (Django)                              │
│  هویت، نقش، مدرسه/موسسه، کلاس، مجوزها       │
│  انتخاب دانش‌آموزان مجاز، KPI سطح مدرسه     │
└───────────────────┬─────────────────────────┘
                    │ user_id + دستورات آزمون
                    ▼
┌─────────────────────────────────────────────┐
│ Athena Engine (FastAPI / این سرویس)         │
│  Problem / Exam / ExamSession / Attempt     │
│  نمره‌دهی، lifecycle جلسه، snapshot سؤال    │
└─────────────────────────────────────────────┘
                    │
                    ▼
              PostgreSQL
         (+ Object Storage برای فایل)
```

### اصل مهم

Athena **موتور برگزاری آزمون** است، نه کپی مدل سازمانی دسکو.

Desko تصمیم می‌گیرد «چه کسانی از کدام مدرسه مجازند».  
Athena اجرا می‌کند «این `user_id`ها در این جلسه شرکت کنند / پاسخ بدهند / نمره بگیرند».

---

## ۴. تصمیم‌های معماری (فریز شده)

### ۴.۱ Tenancy و اسکوپ مدرسه / موسسه

**تصمیم:** داخل `ExamSession` (و به‌طور کلی دامنهٔ Athena) فیلد `school_id` / `institution_id` نگه نمی‌داریم.

فقط شناسهٔ کاربر:

- شرکت‌کننده: `user_id`
- (پیشنهادی برای فاز authoring) سازنده: `created_by: user_id` اگر هنوز روی Exam/Session نیست، اضافه شود

**دلیل:**

- با PRD فعلی هم‌خوان است (فقط `user_id`)
- مدل مدرسه در Desko می‌تواند تغییر کند بدون شکستن schema موتور
- Athena عمومی و قابل استفاده برای چند کلاینت می‌ماند

**Enforce کجا انجام می‌شود؟**

| مسئولیت | لایه |
|---------|------|
| کاربر مال کدام مدرسه است؟ | Desko |
| آیا caller حق ساخت جلسه برای این مدرسه را دارد؟ | Desko / Gateway |
| آیا این لیست `user_id` برای این مدرسه مجاز است؟ | Desko قبل از صدا زدن Athena |
| آیا این `user_id` participant جلسه است؟ | Athena |
| لیست «آزمون‌های مدرسه من» برای KPI | Desko (جدول لینک یا projection)، نه فیلتر داخلی Athena روی school |

اگر بعداً Athena باید مستقلاً لیست مدرسه‌ای بدهد، آن زمان `tenant_id` را با migration جداگانه اضافه می‌کنیم — نه الان.

### ۴.۲ فایل‌ها و `asset_id`

برای PDF/فایل منبع سؤال:

- فایل روی دیسک اپ ذخیره **نشود**
- از Object Storage استفاده شود (S3-compatible: MinIO در dev، R2/S3/Liara/Arvan در prod)
- در دامنهٔ Athena فقط `asset_id` نگه داشته شود (همین الگوی فعلی `SinglePDFSourceSchema`)
- URL خام یا signed URL داخل DB / snapshot دامنه ذخیره **نشود**
- URL امضاشده فقط در لایهٔ API و کوتاه‌عمر ساخته شود

ارجاع پیشنهادی هم‌راستا با ماژول AI دسکو: registry بیرونی Asset با `bucket` + `key` + checksum؛ Athena فقط به `asset_id` اشاره کند.

### ۴.۳ ترتیب تحویل

افقی کار نکن (اول همهٔ queryها، بعد همهٔ routerها).  
عمودی کار کن: هر use-case را از HTTP تا DB تمام کن، بعد برو سراغ بعدی.

Logging عمداً عقب افتاده است؛ بعد از پایدار شدن مسیر فاز ۱ سراغش برو.

---

## ۵. بک‌لاگ فازبندی‌شده

### فاز ۰ — زیرساخت قابل اجرا

هدف: سرویس بالا بیاید و به Postgres وصل شود.

| # | تسک | معیار انجام |
|---|-----|-------------|
| 0.1 | اسکلت FastAPI + lifespan + تنظیمات | `uvicorn` سرویس را بالا می‌آورد |
| 0.2 | سیم‌کشی DI برای `UoWDep` / session | یک endpoint آزمایشی از DB بخواند |
| 0.3 | Alembic + اولین migration از مدل‌های موجود | جداول روی Postgres خالی ساخته شوند |
| 0.4 | Exception mapper مرکزی | یک `DomainError` نمونه به JSON درست map شود |
| 0.5 | `GET /health` | برای compose/k8s آماده باشد |

**نکته:** تا فاز ۰ تمام نشده، روی Routerهای دامنه وقت نگذار.

### فاز ۱ — مسیر دانش‌آموز (اولویت محصول)

هدف: یک دانش‌آموز assigned بتواند آزمون بدهد و نتیجه ببیند.

| # | تسک | Service موجود / کار باقی‌مانده |
|---|-----|--------------------------------|
| 1.1 | Queryهای read برای session summary + problems (public only) | تکمیل repository/read DTO |
| 1.2 | `POST .../attempts` — start/resume | `StartAttemptService` |
| 1.3 | `GET .../problems` — فقط public payload | بدون لو دادن `private_payload` |
| 1.4 | `PUT/PATCH .../answers` — upsert پاسخ | `SendAnswerService` |
| 1.5 | `POST .../submit` — تحویل + grading | `SubmitAttemptService` + رفع باگ‌های زیر |
| 1.6 | `GET .../result` — نتیجهٔ من | read model نمره / per-answer |

#### بدهی‌های فنی که باید داخل فاز ۱ بسته شوند

1. بعد از grading موفق، مسیر `finish()` را کامل کنید؛ attempt نباید برای همیشه تابه‌جا روی `SUBMITTED` بماند اگر مدل `FINISHED` را تعریف کرده.
2. `except Exception: pass` در `SubmitAttemptService` قابل قبول نیست برای تحویل؛ حداقل log + وضعیت قابل مشاهده؛ بهتر: خطای grading بلعیده نشود یا به حالت قابل retry برود.
3. semantic خطاها را تمیز کنید (مثلاً exam منتشرنشده نباید لزوماً `ExamNotFound` باشد اگر معنای دقیق‌تری دارید — یا در mapper پیام/کد خطا را شفاف کنید).

### فاز ۲ — مسیر مدیر / نویسنده

| # | تسک |
|---|-----|
| 2.1 | ایجاد / انتشار Problem |
| 2.2 | ایجاد Exam پیش‌نویس، افزودن سؤال، publish |
| 2.3 | ایجاد ExamSession + add/remove participants |
| 2.4 | مشاهدهٔ خلاصهٔ جلسه و roster |
| 2.5 | cancel / تغییر بازهٔ زمانی (در صورت نیاز محصول) |

اگر زمان فشرده است، authoring فاز ۲ می‌تواند موقتاً از طریق script/admin داخلی تست شود؛ ولی برای دموی واقعی حداقل 2.3 لازم است مگر داده را با fixture بسازید.

### فاز ۳ — Worker همگام‌سازی وضعیت جلسه

هدف: `ExamSession.status` با زمان واقعی هم‌خوان شود.

رفتار مورد انتظار:

- `now >= start_time` و هنوز `SCHEDULED` → `start()`
- `now >= end_time` و `RUNNING`/`SCHEDULED` → `complete()`
- (اختیاری ولی توصیه‌شده) attemptهای `IN_PROGRESS` منقضی‌شده auto-submit شوند

نکات طراحی:

- `StartAttemptService` الان عمداً روی **بازهٔ زمانی** تکیه می‌کند، نه فقط روی `RUNNING`. این درست است؛ worker وضعیت را همگام می‌کند تا UI/گزارش‌ها درست باشند.
- پیاده‌سازی اولیه می‌تواند ساده باشد (periodic task داخل همان سرویس یا Celery دسکو). صف پیچیده لازم نیست مگر بار بالا داشته باشید.
- Redis فعلاً برای این کار اجباری نیست؛ فقط اگر broker می‌خواهید واردش شوید.

### فاز ۴ — Logging و مشاهده‌پذیری

بعد از پایدار شدن فاز ۱:

- structured logging روی مرز serviceها
- `request_id` / correlation id
- لاگ شکست grading با `attempt_id` + traceback
- متریک‌های حداقلی (اختیاری): تعداد start/submit/fail

---

## ۶. قرارداد اولیهٔ API — فاز ۱

پیشنهاد prefix: `/api/v1`

احراز هویت در فاز اول می‌تواند از Desko بیاید (JWT/forwarded user). Athena حداقل باید `user_id` معتبر و مجاز را از لایهٔ بالا دریافت کند. جزئیات auth با Desko جدا هماهنگ می‌شود؛ این سند روی سطح دامنه تمرکز دارد.

### ۶.۱ شروع یا ازسرگیری attempt

`POST /api/v1/exam-sessions/{session_id}/attempts`

Body:

```json
{
  "user_id": "uuid"
}
```

Response `200` یا `201`:

```json
{
  "attempt_id": "uuid",
  "started_at": "ISO-8601",
  "expire_at": "ISO-8601"
}
```

### ۶.۲ لیست سؤال‌های جلسه (عمومی)

`GET /api/v1/exam-sessions/{session_id}/problems`

قوانین:

- فقط برای participant با وضعیت `ASSIGNED` (و ideally attempt فعال یا در پنجرهٔ زمانی)
- **هرگز** `private_payload` / `correct_option_id` برنگردد
- ترتیب بر اساس `order_index`

### ۶.۳ ثبت پاسخ

`PUT /api/v1/attempts/{attempt_id}/answers/{exam_session_problem_id}`

Body نمونه (MCQ):

```json
{
  "user_id": "uuid",
  "selected_option_id": 2
}
```

Response:

```json
{
  "expire_at": "ISO-8601"
}
```

اگر attempt منقضی شده باشد، رفتار فعلی دامنه (auto-submit سپس raise) را در HTTP به شکل شفاف map کنید (مثلاً `409` با کد `attempt_expired`).

### ۶.۴ تحویل آزمون

`POST /api/v1/attempts/{attempt_id}/submit`

Body:

```json
{
  "user_id": "uuid"
}
```

Response: `204` یا خلاصهٔ وضعیت بعد از grading.

### ۶.۵ نتیجه

`GET /api/v1/attempts/{attempt_id}/result`

فقط برای صاحب attempt (و بعد از submit/finish).  
شامل نمرهٔ کل و در صورت نیاز جزئیات per-answer بدون لو دادن چیزی بیش از نیاز محصول.

### ۶.۶ حداقل‌های فاز ۲ (برای ساخت داده)

این‌ها را در فاز ۱ کامل design نکن مگر لازم است؛ فقط برای برنامه‌ریزی:

- `POST /api/v1/problems`
- `POST /api/v1/exams` / افزودن سؤال / publish
- `POST /api/v1/exam-sessions`
- `POST /api/v1/exam-sessions/{id}/participants`
- `DELETE /api/v1/exam-sessions/{id}/participants`

---

## ۷. نگاشت Exception دامنه → HTTP

یک mapper مرکزی بنویس. داخل هر router جداگانه `try/except` پراکنده نگذار.

| خانوادهٔ خطا | نمونه | HTTP | توضیح |
|--------------|-------|------|-------|
| Not found | `ExamNotFound`, `SessionAttemptNotFound`, `ExamSessionProblemNotFound` | `404` | منبع وجود ندارد یا برای این user قابل دیدن نیست (در موارد ownership عمداً 404) |
| Conflict / state | `AttemptAlreadySubmitted`, `SessionWasCancelled`, `InvalidStatusTransition`, `ExamNotEditable` | `409` | وضعیت فعلی اجازهٔ عمل را نمی‌دهد |
| Validation دامنه | `InvalidScoring`, `InvalidTimePeriod`, `EmptyExamCannotBePublished`, `InvalidSessionStartTime` | `422` | ورودی از نظر دامنه نامعتبر |
| Authorization دامنه | `ParticipantIsNotAssigned` | `403` | کاربر در roster نیست |
| سایر `DomainError` | — | `400` | پیش‌فرض امن |
| Unexpected | — | `500` | لاگ اجباری (از فاز ۴؛ تا قبلش حداقل stderr/struct log موقت) |

شکل پیشنهادی body خطا:

```json
{
  "error_code": "participant_is_not_assigned",
  "message": "Participant is not assigned to this session."
}
```

`error_code` را از نام کلاس exception به snake_case پایدار بساز تا فرانت/Desko بتوانند روی آن تکیه کنند.

---

## ۸. Queryها و Read Model

برای فاز ۱، query را «هر آنچه ممکن است» ننویس. فقط آنچه Router لازم دارد:

1. Session summary (status, start/end, title)
2. Participant status برای `(session_id, user_id)`
3. Attempt summary برای `(session_id, user_id)` یا `attempt_id`
4. لیست problems جلسه با **public payload**
5. Grading data فقط داخل مسیر submit (server-side)
6. Result view بعد از submit

اگر repository فعلی متد لازم را دارد، همان را مصرف کن. متد جدید فقط وقتی اضافه کن که DTO پاسخ API را تمیزتر یا ایمن‌تر می‌کند (مثلاً projection بدون private fields).

---

## ۹. Worker — محدودهٔ دقیق

### باید انجام دهد

- Transition وضعیت `ExamSession` بر اساس زمان
- (ترجیحی) بستن attemptهای منقضی

### نباید انجام دهد

- ساخت exam/problem
- نمره‌دهی دوبارهٔ گسترده مگر برای attemptهای auto-submit
- منطق مدرسه/نقش کاربر

### پیشنهاد پیاده‌سازی اولیه

- یک job هر N ثانیه/دقیقه
- انتخاب candidiateها با ایندکسهای موجود (`status`, `end_time` و مشابه)
- پردازش batch با قفل سطری (`FOR UPDATE SKIP LOCKED` اگر لازم شد)

تا وقتی worker نیست، مسیر دانش‌آموز نباید بشکند؛ چون start attempt روی time window است. Worker کیفیت وضعیت و گزارش را کامل می‌کند.

---

## ۱۰. چیزهایی که عمداً الآن انجام نمی‌دهیم

- ذخیرهٔ `school_id` روی session
- ذخیرهٔ URL فایل داخل schema دامنه
- Logging کامل و داشبورد مشاهده‌پذیری قبل از اتمام فاز ۱
- پشتیبانی از انواع سؤال غیر از MCQ
- بهینه‌سازی زودرس Redis برای کش آزمون
- یکپارچه‌سازی کامل compose تا قبل از داشتن health + migration + یک مسیر API پایدار

---

## ۱۱. ترتیب پیشنهادی کار برای هفتهٔ پیش رو

1. فاز ۰ را تمام کن تا سرویس واقعاً boot شود  
2. Fixture یا اسکریپت موقت برای ساخت ExamSession + participant (اگر فاز ۲ هنوز نیست)  
3. Vertical slice: start attempt → get problems → send answer → submit → result  
4. Exception mapper را روی همین مسیر سفت کن  
5. بدهی grading/finish را ببند  
6. بعد برو سراغ authoring API یا worker — هرکدام برای دموی بعدی لازم‌تر است

---

## ۱۲. چک‌لیست Definition of Done برای فاز ۱

- [ ] سرویس با migration روی Postgres بالا می‌آید
- [ ] دانش‌آموز assigned می‌تواند attempt شروع کند
- [ ] سؤال‌ها بدون جواب درست برمی‌گردند
- [ ] پاسخ upsert می‌شود
- [ ] submit نمره می‌دهد و وضعیت attempt نهایی مشخص است
- [ ] خطاهای دامنه به HTTP پایدار map می‌شوند
- [ ] حداقل یک تست یکپارچه یا اسکریپت e2e دستی مستند برای مسیر بالا وجود دارد

---

## ۱۳. پیام نهایی برای اجرا

تمرکز فعلی این نیست که مدل دامنه را بزرگ‌تر کنیم.  
تمرکز این است که **همان دامنه را قابل فراخوانی، قابل استقرار، و قابل دمو برای مسیر دانش‌آموز** کنیم.

اگر بین «کامل‌کردن همهٔ authoring» و «بستن مسیر دانش‌آموز» مجبور به انتخاب شدی، مسیر دانش‌آموز را انتخاب کن.

برای ابهام‌های محصولی باقی‌مانده فقط همین کانال تصمیم‌گیری را استفاده کن؛ وسط پیاده‌سازی فرض جدید دربارهٔ tenancy یا URL فایل وارد کد نکن.
