import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();

async function main() {
  // 1. set logo + favicon in branding settings
  const branding = await db.setting.findUnique({ where: { key: "branding" } });
  if (branding) {
    const val = JSON.parse(branding.value);
    val.logoUrl = "/ejs-logo.png";
    val.faviconUrl = "/ejs-logo.png";
    await db.setting.update({ where: { key: "branding" }, data: { value: JSON.stringify(val) } });
    console.log("logo set in branding");
  }

  // 2. student terms page
  const studentTermsBody = `قبل التقديم لالتحاق طفلك بالمدارس المصرية اليابانية، يرجى قراءة الشروط والأحكام التالية بعناية والموافقة عليها:

**أولاً: شروط القبول**
1. أن يكون الطفل مصري الجنسية من أبوين مصريين.
2. أن يكون سن الطفل ضمن الشريحة العمرية المحددة للمرحلة المتقدم لها (تحسب في أول أكتوبر من عام التقديم).
3. التقديم للصفوف من رياض أطفال مستوى أول (KG1) حتى الصف الثالث الابتدائي.
4. للمراحل الأعلى يشترط التحويل من مدرسة لغات معتمدة.

**ثانياً: إجراءات التقديم**
1. يتم التقديم إلكترونياً عبر البوابة الرسمية فقط.
2. يجب تعبئة جميع البيانات بدقة وأمانة، وأي بيانات غير صحيحة تؤدي لإلغاء الطلب.
3. عامل الوقت معيار هام في تقييم طلبات التقدم.
4. تُعقد مقابلة شخصية للطالب وولي الأمر بعد المرحلة الأولى للفرز.

**ثالثاً: المستندات المطلوبة**
1. شهادة ميلاد الطفل الرقمية من الأحوال المدنية.
2. بطاقة الرقم القومي لولي الأمر.
3. شهادة تطعيم الطفل.
4. عدد ٦ صور شخصية حديثة للطفل.
5. شهادة قيد من المدرسة السابقة (للطلاب المحولين).

**رابعاً: الالتزامات**
1. الالتزام بحضور المقابلة الشخصية في الموعد المحدد.
2. سداد الرسوم المقررة عند القبول.
3. الالتزام بأنظمة المدرسة وقواعد السلوك المعمول بها.
4. ولوزارة التربية والتعليم الحق في عدم قبول طلب الالتحاق دون إبداء أسباب.

**خامساً: إقرار ولي الأمر**
بموافقتي على هذه الشروط، أقر بصحة البيانات المقدمة وأتعهد بتقديم المستندات الأصلية عند الطلب.`;

  await db.page.upsert({
    where: { slug: "student-terms" },
    create: { slug: "student-terms", titleAr: "شروط وأحكام التقديم للطلاب", bodyAr: studentTermsBody, isActive: true },
    update: { titleAr: "شروط وأحكام التقديم للطلاب", bodyAr: studentTermsBody, isActive: true },
  });

  // 3. teacher terms page
  const teacherTermsBody = `قبل التقدم للعمل بالمدارس المصرية اليابانية، يرجى قراءة الشروط والأحكام التالية بعناية والموافقة عليها:

**أولاً: الشروط العامة**
1. أن يكون المتقدم مصري الجنسية.
2. أن يكون لائقاً طبياً للعمل.
3. حسن السير والسلوك وغير محكوم عليه في جرائم مخلة بالشرف.
4. ألا يتجاوز السن المحدد للوظيفة المتقدم لها.

**ثانياً: المؤهلات العلمية**
1. بكالوريوس تربية أو ليسانس آداب/علوم + دبلوم تربوي (للمعلمين).
2. تقدير عام جيد جداً على الأقل.
3. اجتياز اختبارات الكفاءة التربوية المعتمدة.
4. إتقان اللغة الإنجليزية للمتقدمين لمدارس اللغات.

**ثالثاً: الخبرات والمهارات**
1. خبرة لا تقل عن ٣ سنوات في مجال التدريس (يُفضل).
2. الإلمام بمنهجية «توكاتسو» الياباني أو الاستعداد للتدريب عليها.
3. مهارات التواصل الفعّال والعمل ضمن فريق.
4. القدرة على استخدام التكنولوجيا في التعليم.

**رابعاً: إجراءات التقديم**
1. يتم التقديم إلكترونياً عبر البوابة الرسمية فقط.
2. تعبئة الاستمارة بالكامل مع رفع السيرة الذاتية والمستندات.
3. تُعقد مقابلة شخصية واختبارات تخصص.
4. اجتياز برنامج التدريب التأهيلي للمقبولين.

**خامساً: الالتزامات**
1. الالتزام بالعمل لمدة لا تقل عن ٣ سنوات بالمدرسة عند القبول.
2. المشاركة في برامج التطوير المهني المستمر.
3. الالتزام بأخلاقيات المهنة وقواعد السلوك.
4. ولوزارة التربية والتعليم الحق في رفض أي طلب دون إبداء أسباب.

**سادساً: إقرار المتقدم**
بموافقتي على هذه الشروط، أقر بصحة البيانات والمستندات المقدمة.`;

  await db.page.upsert({
    where: { slug: "teacher-terms" },
    create: { slug: "teacher-terms", titleAr: "شروط وأحكام التقديم للمعلمين", bodyAr: teacherTermsBody, isActive: true },
    update: { titleAr: "شروط وأحكام التقديم للمعلمين", bodyAr: teacherTermsBody, isActive: true },
  });

  // 4. seed a few sample student applications for the reports demo
  const schools = await db.school.findMany({ take: 8, where: { isActive: true, isArchived: false }, include: { grades: true, city: true, governorate: true } });
  const grades = await db.grade.findMany({ orderBy: { sortOrder: "asc" } });
  const existing = await db.studentApplication.count();
  if (existing === 0) {
    const samples = [
      { student: "أحمد محمد علي", guardian: "محمد علي حسن", phone: "01012345678", natid: "30101012345678", gender: "MALE", gradeIdx: 0, status: "PENDING" },
      { student: "فاطمة أحمد خالد", guardian: "أحمد خالد إبراهيم", phone: "01098765432", natid: "30202098765432", gender: "FEMALE", gradeIdx: 1, status: "REVIEW" },
      { student: "عمر سعيد عبد الله", guardian: "سعيد عبد الله محمود", phone: "01155667788", natid: "30303055667788", gender: "MALE", gradeIdx: 0, status: "ACCEPTED" },
      { student: "مريم خالد إبراهيم", guardian: "خالد إبراهيم علي", phone: "01233445566", natid: "30404033445566", gender: "FEMALE", gradeIdx: 2, status: "PENDING" },
      { student: "يوسف أمين حسن", guardian: "أمين حسن سعد", phone: "01099887766", natid: "30505099887766", gender: "MALE", gradeIdx: 0, status: "WAITLIST" },
      { student: "نورهان سامي فؤاد", guardian: "سامي فؤاد عادل", phone: "01566778899", natid: "30606066778899", gender: "FEMALE", gradeIdx: 1, status: "PENDING" },
      { student: "عبد الرحمن طارق نبيل", guardian: "طارق نبيل فتحي", phone: "01066554433", natid: "30707066554433", gender: "MALE", gradeIdx: 3, status: "REVIEW" },
      { student: "ملك وليد صبري", guardian: "وليد صبري رضا", phone: "01277889900", natid: "30808077889900", gender: "FEMALE", gradeIdx: 0, status: "ACCEPTED" },
      { student: "آدم هشام جمال", guardian: "هشام جمال منصور", phone: "01044556677", natid: "30909044556677", gender: "MALE", gradeIdx: 2, status: "PENDING" },
      { student: "جنى عمرو فتحي", guardian: "عمرو فتحي سعيد", phone: "01122334455", natid: "30010122334455", gender: "FEMALE", gradeIdx: 0, status: "REJECTED" },
    ];
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i];
      const school = schools[i % schools.length];
      const grade = grades[s.gradeIdx] || grades[0];
      const ref = `EJS-S-2026-${String(i + 1).padStart(6, "0")}`;
      await db.studentApplication.create({
        data: {
          referenceNo: ref,
          studentNameAr: s.student,
          birthDate: "2020-0" + (s.gradeIdx + 1) + "-15",
          gender: s.gender,
          nationalId: s.natid,
          nationality: "مصري",
          guardianName: s.guardian,
          guardianRelation: "father",
          guardianPhone: s.phone,
          guardianNationalId: String(BigInt(s.natid) + 10000000000000n).slice(0, 14),
          guardianOccupation: "موظف",
          governorateId: school.governorateId,
          cityId: school.cityId,
          schoolId: school.id,
          gradeId: grade.id,
          previousSchool: "",
          addressAr: `${school.city.nameAr} - ${school.governorate.nameAr}`,
          skillsAnswers: JSON.stringify([{ q: "ما المهارات التي يتمتع بها طفلك؟", a: "القراءة والرسم" }]),
          termsAccepted: true,
          termsAcceptedAt: new Date(Date.now() - i * 86400000),
          termsVersion: "2026-v1",
          status: s.status,
          submittedAt: new Date(Date.now() - i * 86400000),
        },
      });
    }
    console.log(`seeded ${samples.length} student applications`);
  }

  // 5. seed a few teacher applications
  const teacherExisting = await db.teacherApplication.count();
  if (teacherExisting === 0) {
    const tSamples = [
      { name: "أ. سما أحمد محمود", subj: "اللغة العربية", qual: "Master", gov: 0, years: 7, status: "PENDING" },
      { name: "أ. خالد فؤاد علي", subj: "الرياضيات", qual: "Bachelor", gov: 1, years: 4, status: "REVIEW" },
      { name: "أ. منى سعيد إبراهيم", subj: "العلوم", qual: "PhD", gov: 2, years: 12, status: "ACCEPTED" },
      { name: "أ. أحمد رضا عبد الله", subj: "اللغة الإنجليزية", qual: "Bachelor", gov: 0, years: 5, status: "PENDING" },
      { name: "أ. دعاء حسن أمين", subj: "الدراسات الاجتماعية", qual: "Bachelor", gov: 3, years: 3, status: "WAITLIST" },
    ];
    const govs = await db.governorate.findMany({ take: 5 });
    for (let i = 0; i < tSamples.length; i++) {
      const t = tSamples[i];
      const ref = `EJS-T-2026-${String(i + 1).padStart(6, "0")}`;
      await db.teacherApplication.create({
        data: {
          referenceNo: ref,
          fullNameAr: t.name,
          birthDate: "1988-06-15",
          gender: i % 2 === 0 ? "FEMALE" : "MALE",
          nationalId: `28${String(88000000000000 + i * 1111).slice(0, 13)}`,
          nationality: "مصري",
          phone: `0100${String(1234567 + i).padStart(7, "0")}`,
          email: `teacher${i + 1}@example.com`,
          addressAr: govs[i % govs.length].nameAr,
          qualification: t.qual,
          university: "جامعة عين شمس",
          graduationYear: 2010 + i,
          specialization: t.subj,
          subjects: t.subj,
          yearsOfExperience: t.years,
          currentEmployer: "وزارة التربية والتعليم",
          currentPosition: "معلم",
          hasTeachingCert: true,
          preferredGovernorateId: govs[i % govs.length].id,
          notes: "",
          termsAccepted: true,
          termsAcceptedAt: new Date(Date.now() - i * 86400000),
          termsVersion: "2026-v1",
          status: t.status,
          submittedAt: new Date(Date.now() - i * 86400000),
        },
      });
    }
    console.log(`seeded ${tSamples.length} teacher applications`);
  }

  console.log("done");
}
main().catch(console.error).finally(() => db.$disconnect());
