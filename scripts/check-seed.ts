import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
(async () => {
  const pages = await db.page.findMany({
    where: { slug: { contains: "terms" } },
    select: { slug: true, titleAr: true, isActive: true },
  });
  const branding = await db.setting.findUnique({ where: { key: "branding" } });
  console.log("TERMS PAGES:", JSON.stringify(pages, null, 2));
  console.log("LOGO URL:", JSON.parse(branding.value).logoUrl);
  const users = await db.user.count();
  console.log("USERS:", users);
  await db.$disconnect();
})();
