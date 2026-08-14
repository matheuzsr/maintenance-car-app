import { Injectable } from '@nestjs/common';
import { MaintenanceTemplate, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListMaintenanceTemplatesQueryDto } from './dto';

@Injectable()
export class MaintenanceTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(
    query: ListMaintenanceTemplatesQueryDto,
  ): Promise<MaintenanceTemplate[]> {
    const where: Prisma.MaintenanceTemplateWhereInput = {
      active: true,
      ...(query.category ? { category: query.category } : {}),
    };

    return this.prisma.maintenanceTemplate.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }
}
