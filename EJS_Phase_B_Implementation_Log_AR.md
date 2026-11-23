# سجل تنفيذ Phase B — EJS Admission

**الفرع:** `claude-enhancement` (أُنشئ من `claude/relaxed-knuth-mfzp62` @ `bdae9dcc5374800cbbebd87f9ce27cc1faf94f0e`)
**الخطة المرجعية:** `EJS_Admission_7_Day_Launch_Plan_AR.md` (نفس الـ commit)
**القواعد:** لا merge إلى `main`، ولا deploy، ولا بيانات حقيقية، ولا أسرار إنتاج، ولا تحديث لحزم B16 قبل موافقة صريحة.

---

## الدفعة 1 — 2026-11-23

### Preflight
- الحالة قبل البدء: الفرع `claude/relaxed-knuth-mfzp62` عند `bdae9dc`، والـ working tree نظيف، و`origin/claude/relaxed-knuth-mfzp62` = `bdae9dc`.
- الفرق بين `main` (`4c79b3c`) و`bdae9dc` هو ملف الخطة فقط (`git diff --stat`).
- إنشاء `claude-enhancement` من `bdae9dc` ودفعه. الفروع الأخرى دون تغيير:
  - `main` = `4c79b3c`
  - `feature/applicant-document-upload` = `64cac8d`
  - `feature/vercel-migration` = `28209ac`
  - `claude/relaxed-knuth-mfzp62` = `bdae9dc`

### المهام المنفذة

| المهمة | التغيير | السبب |
|---|---|---|
| **T1.1** (إعادة baseline) | لا تغيير في الملفات. `npm ci` من `package-lock.json` كما هو، ثم `tsc` و`build` و`lint` | قياس الأساس على الفرع الجديد قبل أي إصلاح وظيفي |
| **T1.4** | `git rm --cached .env` (الملف المحلي باقٍ على القرص ولم يُعدَّل). إضافة `.env.example` بقيم نموذجية فقط. إضافة استثناء `!.env.example` إلى `.gitignore` | `.env` كان متتبَّعاً رغم `.gitignore`. والقالب يوثّق المتغيرات المستخدمة فعلاً في الكود (`process.env.*`)، ويصحح الإيحاء بأن SQLite يعمل محلياً. والاستثناء لازم لأن نمط `.env*` كان سيخفي القالب نفسه |
| **T1.5** (B4) | حذف `src/app/api/auth/debug/route.ts` و`src/app/api/route.ts` | endpoint تشخيصي عام بلا مصادقة يكشف عدد المستخدمين ونص أخطاء الـ DB، و endpoint تجريبي "Hello, world!". لا توجد أي إشارات إليهما في الكود أو الوثائق |

### الاختبارات والفحوصات المنفذة (نتائج فعلية)

| الفحص | الأمر | النتيجة |
|---|---|---|
| تثبيت | `npm ci` | exit 0 (873 حزمة من الـ lockfile، بلا تعديل) |
| TypeScript | `npx tsc --noEmit` | exit 2، **61 خطأ**. **مطابق حرفياً** لـ baseline Phase A (diff فارغ). لا أخطاء جديدة ولا محذوفة |
| Build | `npm run build` (بلا متغيرات إنتاج) | exit 0. قائمة المسارات تحتوي 51 API route، و**`/api/auth/debug` و`/api` غائبان** |
| ESLint | `npm run lint` | exit 1، **15 خطأ و3 تحذيرات**. **مطابقة** لـ baseline Phase A |
| Runtime (T1.5) | `next start` محلي على `127.0.0.1:3100` بقيم اختبار عشوائية (لا أسرار إنتاج، ولا قاعدة بيانات حقيقية) ثم `curl` | `GET /api` = **404**. `GET /api/auth/debug` = **400** (`Error: This action with HTTP GET is not supported by NextAuth.js`)، دون أي بيانات تشخيصية. والخادم أُوقف بعد الفحص |

### تعارض مع الخطة — معلّق بانتظار قرار
- **معيار قبول T1.5 في الخطة:** "GET يعيد 404" لكلا المسارين.
- **الواقع:** بعد حذف `api/auth/debug/route.ts`، يقع المسار `/api/auth/debug` تحت catch-all الخاص بـ NextAuth (`src/app/api/auth/[...nextauth]/route.ts`)، فيعيد NextAuth **400** لأي action غير معروف (`node_modules/next-auth/core/index.js:328-329`).
- **الأثر الأمني:** لا يوجد. الرد لا يحتوي عدد مستخدمين ولا متغيرات بيئة ولا أخطاء DB.
- **لم يُتخذ قرار.** الخيارات:
  1. **(موصى به)** تعديل معيار القبول في الخطة إلى: "لا يعيد 200، ولا يحتوي أي بيانات تشخيصية (404 لـ `/api`، و400 من NextAuth لـ `/api/auth/debug`)".
  2. إضافة معالجة خاصة لإرجاع 404. **غير موصى به** لأنه تعديل على مسار المصادقة خارج حاجة أمنية.

### الاختبارات غير المنفذة
- الاختبارات الآلية لـ T1.5 (TS-06f) **لم تُكتب بعد**، لأن بنية الاختبار (T1.2) لم تُنشأ. الفحص أعلاه يدوي ومحلي.
- كل سيناريوهات القسم 3 تنتظر T1.2.

### مخاطر وملاحظات
- **إزالة `.env` من التتبع:** أي مطوّر لديه `.env` متتبَّع من `main` ثم ينتقل إلى `claude-enhancement` سيحذف git ملفه المحلي `.env` من مجلد العمل. **يجب نسخ `.env` احتياطياً قبل الانتقال.** (الملف هنا بقي لأن الحذف تم بـ `--cached`.)
- `npm ci` يُبلغ عن 32 ثغرة في الاعتماديات (كما في Phase A). معالجة `next` و`next-auth` تنتظر موافقة B16.
- خادم PostgreSQL المحلي للاختبار متوقف منذ إعادة تشغيل الحاوية، ولم يُعد تشغيله (غير مطلوب لهذه الدفعة).
