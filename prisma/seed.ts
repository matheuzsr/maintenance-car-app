import { MaintenanceCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  ['engine-oil', 'Engine oil', MaintenanceCategory.ENGINE, 12, 10000],
  ['oil-filter', 'Oil filter', MaintenanceCategory.FILTERS, 12, 10000],
  [
    'engine-air-filter',
    'Engine air filter',
    MaintenanceCategory.FILTERS,
    12,
    10000,
  ],
  ['cabin-filter', 'Cabin air filter', MaintenanceCategory.FILTERS, 12, 10000],
  ['fuel-filter', 'Fuel filter', MaintenanceCategory.FILTERS, 24, 20000],
  ['brake-pads', 'Brake pads', MaintenanceCategory.BRAKES, 12, 10000],
  ['brake-fluid', 'Brake fluid', MaintenanceCategory.BRAKES, 24, null],
  ['spark-plugs', 'Spark plugs', MaintenanceCategory.ENGINE, null, 40000],
  ['accessory-belts', 'Accessory belts', MaintenanceCategory.ENGINE, 24, null],
  ['tires', 'Tires', MaintenanceCategory.TIRES, 12, 10000],
  ['battery', 'Battery', MaintenanceCategory.ELECTRICAL, 36, null],
  ['coolant', 'Coolant', MaintenanceCategory.COOLING, 48, 60000],
] as const;

async function main(): Promise<void> {
  for (const [slug, name, category, months, km] of templates) {
    await prisma.maintenanceTemplate.upsert({
      where: { slug },
      update: {
        name,
        category,
        suggestedIntervalMonths: months,
        suggestedIntervalKm: km,
        active: true,
      },
      create: {
        slug,
        name,
        category,
        suggestedIntervalMonths: months,
        suggestedIntervalKm: km,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
