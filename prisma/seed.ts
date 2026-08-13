import { MaintenanceCategory, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  ['engine-oil', 'Óleo do motor', MaintenanceCategory.ENGINE, 12, 10000],
  ['oil-filter', 'Filtro de óleo', MaintenanceCategory.FILTERS, 12, 10000],
  ['engine-air-filter', 'Filtro de ar do motor', MaintenanceCategory.FILTERS, 12, 10000],
  ['cabin-filter', 'Filtro de cabine', MaintenanceCategory.FILTERS, 12, 10000],
  ['fuel-filter', 'Filtro de combustível', MaintenanceCategory.FILTERS, 24, 20000],
  ['brake-pads', 'Pastilhas de freio', MaintenanceCategory.BRAKES, 12, 10000],
  ['brake-fluid', 'Fluido de freio', MaintenanceCategory.BRAKES, 24, null],
  ['spark-plugs', 'Velas de ignição', MaintenanceCategory.ENGINE, null, 40000],
  ['accessory-belts', 'Correias auxiliares', MaintenanceCategory.ENGINE, 24, null],
  ['tires', 'Pneus', MaintenanceCategory.TIRES, 12, 10000],
  ['battery', 'Bateria', MaintenanceCategory.ELECTRICAL, 36, null],
  ['coolant', 'Líquido de arrefecimento', MaintenanceCategory.COOLING, 48, 60000],
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
