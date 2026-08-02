import { config } from "dotenv";
config({ path: ".env.local" });
const { prisma } = await import("@/lib/db");

const dept = await prisma.department.findMany({
  where: { name: { in: ["Engineering", "Old Name", "New Name"] } },
  include: { organization: { select: { slug: true, name: true } } },
});
console.log(JSON.stringify(dept.map((d) => ({ name: d.name, org: d.organization.slug, deletedAt: d.deletedAt })), null, 2));
await prisma.$disconnect();
