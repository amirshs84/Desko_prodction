# نقد قرارداد API — برای توسعه‌دهنده Athena

مخاطب: دولوپر موتور آزمون  
منبع: پیش‌نویس `api.md`  
هدف: قبل از نوشتن query/router این موارد را ببندیم.

---

## `DELETE /sessions/{session_id}/participants/{participant_id}`

**مشکل**  
در فهرست مسیرها `participant_id` است، در توضیح همان endpoint نوشته `user_id`. دامنه فعلی (`RemoveParticipantService`) با `user_id` کار می‌کند.

**راه حل**  
مسیر را یکدست کن:

`DELETE /sessions/{session_id}/participants/{user_id}`

---

## `GET /session/{session_id}`

**مشکل**  
جمع/مفرد ناسازگار است. بقیهٔ مسیرها `sessions` هستند.

**راه حل**  
`GET /sessions/{session_id}`

---

## `POST /attempts/{attempe_id}/submit`

**مشکل**  
Typo: `attempe_id`.

**راه حل**  
`POST /attempts/{attempt_id}/submit`

---

## فیلد `lable` در options

**مشکل**  
Typo در responseهای problems.

**راه حل**  
`label`

---

## فیلد `response_date` در `GET /attempts/{attempt_id}/answers`

**مشکل**  
Typo؛ payload دامنه `response_data` است.

**راه حل**  
`response_data`

---

## `POST /exams`

**مشکل**  
۱. با دامنه فعلی جور نیست: امروز جریان `Problem → Exam.add_problem → publish` است؛ این endpoint یک orchestration یک‌مرحله‌ای است که هنوز Service ندارد.  
۲. `source` بدون `order_index` آمده؛ در `SinglePDFSourceSchema` این فیلد اجباری است.  
۳. `exam_type` و `config.render_mode` تکراری‌اند.  
۴. `score` / `negative_score` مشخص نیست؛ دامنه `Scoring` اجباری دارد.  
۵. مشخص نیست خروجی create همان exam منتشرشده است یا DRAFT (در حالی که session فقط از exam `PUBLISHED` ساخته می‌شود).

**راه حل**  
- یک `CreateSinglePdfExamService` تعریف کن که زیر پوست: N تا `Problem(MCQ)` بسازد، به Exam بچسباند، publish کند، `exam_id` برگرداند.  
- برای منبع PDF سطح آزمون، schema جدا بدون `order_index` بگذار؛ `order_index` فقط روی meta هر سؤال بماند.  
- یکی از `exam_type` / `render_mode` را حذف کن.  
- حداقل یک default سراسری برای نمره مثبت/منفی در body یا server default مشخص کن.  
- رفتار را صریح بنویس: `POST /exams` = create + publish.

---

## `POST /exams/{exam_id}/sessions` — جملهٔ «آزمون پرایوت / اسکوپ»

**مشکل**  
نوشت‌های: اگر آزمون private باشد فقط scope مربوطه می‌تواند session بسازد. در Athena نه `private` داریم نه `school/scope`. Tenancy مال Desko است.

**راه حل**  
این جمله را از قرارداد Athena حذف کن. احراز ownership/مجوز ساخت session در Gateway/Desko یا حداکثر با `created_by` روی Exam.

---

## `POST /sessions/{session_id}/participants`

**مشکل**  
Response با `?` رها شده.

**راه حل**  
یکی از این دو را انتخاب و قفل کن:

- `204 No Content`
- یا `200` با بدنهٔ شفاف، مثلاً:

```json
{
  "added": ["uuid"],
  "already_assigned": ["uuid"]
}
```

---

## `GET /sessions/{session_id}/problems` (برای manager)

**مشکل**  
`private_payload` (کلید جواب) برمی‌گردد، ولی قانون دسترسی فقط با عبارت «for manager» آمده. اگر اشتباه expose شود کلید لو می‌رود.

**راه حل**  
در قرارداد صریح بنویس: فقط سازنده/مدیر همان آزمون/جلسه؛ در غیر این صورت `404`. هرگز از مسیرهای attempt این داده را برنگردان.

---

## `POST /sessions/{session_id}/attempts` — خطاهای 409

**مشکل**  
`409 session has not started` با رفتار فعلی `StartAttemptService` ممکن است نخواند؛ آن سرویس عمدتاً روی **بازهٔ زمانی** کار می‌کند، نه لزوماً `status=RUNNING`.

**راه حل**  
یکی را انتخاب و در API و دامنه یکسان کن:

- یا enforce روی `start_time/end_time`
- یا enforce روی `status`

و همان را در لیست Errors بنویس. وضعیت‌های cancel / expired / already submitted را نگه دار.

---

## کدهای خطای ownership / participant

**مشکل**  
گاهی `404` برای `user_id != sub`، گاهی `404` برای participant assign‌نشده، گاهی مفهومی شبیه 403. یکدست نیست.

**راه حل**  
قرارداد پیشنهادی:

- منبع واقعاً نیست → `404`
- attempt مال این user نیست → `404` (anti-enumeration)
- user در roster نیست → `403` با `error_code=participant_is_not_assigned`
- conflict وضعیت → `409`

---

## `GET /attempts/{attempt_id}/result`

**مشکل**  
فقط `??` آمده؛ بدون قرارداد، query و UI بسته نمی‌شود. ضمناً مسیر grade→finish در کد فعلی مشکل دارد؛ این endpoint بدون آن بی‌معناست.

**راه حل**  
حداقل این shape را قفل کن:

```json
{
  "attempt_id": "uuid",
  "status": "FINISHED",
  "score": "12.50",
  "max_score": "20.00",
  "min_score": "0.00",
  "submitted_at": "ISO-8601",
  "answers": [
    {
      "exam_session_problem_id": "uuid",
      "selected_option_id": 2,
      "score": "1.00",
      "is_correct": true
    }
  ]
}
```

و همزمان باگ‌های submit/grading/finish را قبل یا همراه این endpoint ببند.

تصمیم محصولی: آیا بعد از submit کلید/`is_correct` نشان داده شود یا فقط نمرهٔ کل؟ یکی را بنویس.

---

## کل قرارداد نسبت به MVP سی‌ای‌او

**مشکل**  
این API تقریباً فقط برگزاری مجازی تستی + تصحیح خودکار MCQ را می‌پوشاند. در استوری‌های فاز ۱ محصول این‌ها هم هست و اینجا نیست:

- سؤال تشریحی و تنظیم نوع پاسخ
- اعتراض به نمره
- رویداد ضدتقلب (focus lost)
- مصحح / اکانت مهمان
- OCR و آزمون حضوری

اگر بدون اعلام scope برویم جلو، سه هفته روی انتظار اشتباه می‌سوزد.

**راه حل**  
بالای `api.md` بنویس:

> Scope این قرارداد: آزمون مجازی SINGLE_PDF + MCQ + session + attempt + auto-grade.  
> خارج از scope: تشریحی، OCR فیزیکی، مصحح، مهمان، اعتراض، ضدتقلب پیشرفته.

اگر محصول روی ضدتقلب پایه در همین فاز اصرار دارد، حداقل این را اضافه کن:

`POST /attempts/{attempt_id}/events`  
`{ "type": "FOCUS_LOST", "occurred_at": "...", "meta": {} }`

---

## مسیرهای پیشنهادی نهایی (بعد از اصلاح)

```text
POST   /api/v1/exams
POST   /api/v1/exams/{exam_id}/sessions
GET    /api/v1/sessions/{session_id}
PATCH  /api/v1/sessions/{session_id}
POST   /api/v1/sessions/{session_id}/participants
GET    /api/v1/sessions/{session_id}/participants
DELETE /api/v1/sessions/{session_id}/participants/{user_id}
GET    /api/v1/sessions/{session_id}/problems
POST   /api/v1/sessions/{session_id}/attempts
GET    /api/v1/attempts/{attempt_id}
GET    /api/v1/attempts/{attempt_id}/problems
PUT    /api/v1/attempts/{attempt_id}/answers
GET    /api/v1/attempts/{attempt_id}/answers
POST   /api/v1/attempts/{attempt_id}/submit
GET    /api/v1/attempts/{attempt_id}/result
```

اول این‌ها را در `api.md` اصلاح کن، بعد برو سراغ queryها.
