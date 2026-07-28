/**
 * Deterministic reference data only (see SCHEMA_GUIDELINES.txt "Seed Data") —
 * permissions, system roles, and the platform's own "Adotdevs Limited"
 * tenant. Never seed fake business records (users, applications, etc.).
 *
 * Run with: pnpm db:seed
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { PERMISSIONS } from "../src/domains/platform/authorization/permissions";
import { SYSTEM_ROLES } from "../src/domains/platform/authorization/roles";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function seedPermissions() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        name: permission.name,
        description: permission.description,
        module: permission.module,
      },
      create: permission,
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions.`);
}

async function seedSystemRoles() {
  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findFirst({
      where: { name: role.name, organizationId: null },
    });

    const record = existing
      ? await prisma.role.update({
          where: { id: existing.id },
          data: { description: role.description, isDefault: role.isDefault, isSystem: true },
        })
      : await prisma.role.create({
          data: {
            name: role.name,
            description: role.description,
            isDefault: role.isDefault,
            isSystem: true,
            organizationId: null,
          },
        });

    const permissions = await prisma.permission.findMany({
      where: { key: { in: role.permissions } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: record.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: record.id, permissionId: p.id })),
      skipDuplicates: true,
    });
  }
  console.log(`Seeded ${SYSTEM_ROLES.length} system roles.`);
}

async function seedAdotdevs() {
  const adotdevs = await prisma.organization.upsert({
    where: { slug: "adotdevs" },
    update: {},
    create: {
      name: "Adotdevs Limited",
      legalName: "Adotdevs Limited",
      slug: "adotdevs",
      status: "ACTIVE",
      country: "Tanzania",
      timezone: "Africa/Dar_es_Salaam",
      settings: { create: {} },
    },
  });

  const departments = ["Engineering", "Design", "Marketing"];
  for (const name of departments) {
    await prisma.department.upsert({
      where: { organizationId_name: { organizationId: adotdevs.id, name } },
      update: {},
      create: { organizationId: adotdevs.id, name },
    });
  }
  console.log(`Seeded organization "${adotdevs.name}" with ${departments.length} departments.`);

  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  if (adminEmail) {
    const ownerRole = await prisma.role.findFirstOrThrow({
      where: { name: "Owner", organizationId: null },
    });

    const existingInvitation = await prisma.invitation.findFirst({
      where: { organizationId: adotdevs.id, email: adminEmail.toLowerCase(), status: "PENDING" },
    });

    if (!existingInvitation) {
      const { randomBytes } = await import("node:crypto");
      const token = randomBytes(32).toString("hex");
      await prisma.invitation.create({
        data: {
          organizationId: adotdevs.id,
          email: adminEmail.toLowerCase(),
          roleId: ownerRole.id,
          invitedById: null, // bootstrap invitation — no human inviter yet
          token,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        },
      });
      console.log(`Created a 30-day Owner invitation for ${adminEmail}: /invitations/${token}`);
    }
  } else {
    console.log(
      "SEED_ADMIN_EMAIL not set — skipping bootstrap Owner invitation for Adotdevs Limited.",
    );
  }
}

async function main() {
  await seedPermissions();
  await seedSystemRoles();
  await seedAdotdevs();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
