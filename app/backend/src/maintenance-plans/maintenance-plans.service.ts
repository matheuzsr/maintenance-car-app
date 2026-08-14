import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceTemplate,
  Prisma,
  VehicleMaintenancePlan,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMaintenancePlanDto,
  ListMaintenancePlansQueryDto,
  UpdateMaintenancePlanDto,
} from './dto';

export interface PaginatedPlans {
  data: VehicleMaintenancePlan[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class MaintenancePlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    vehicleId: string,
    dto: CreateMaintenancePlanDto,
  ): Promise<VehicleMaintenancePlan> {
    await this.ensureOwnedVehicle(userId, vehicleId);
    const template = dto.templateId
      ? await this.findActiveTemplate(dto.templateId)
      : null;
    const name = dto.name ?? template?.name;
    const description =
      dto.description !== undefined ? dto.description : template?.description;
    const category = dto.category ?? template?.category;
    const intervalMonths =
      dto.intervalMonths !== undefined
        ? dto.intervalMonths
        : template?.suggestedIntervalMonths;
    const intervalKm =
      dto.intervalKm !== undefined
        ? dto.intervalKm
        : template?.suggestedIntervalKm;

    if (!name || !category) {
      throw new BadRequestException(
        'Name and category are required when no template provides them',
      );
    }
    this.ensureInterval(intervalMonths, intervalKm);

    return this.prisma.vehicleMaintenancePlan.create({
      data: {
        userId,
        vehicleId,
        templateId: template?.id,
        name,
        description: description ?? null,
        category,
        intervalMonths: intervalMonths ?? null,
        intervalKm: intervalKm ?? null,
        alertBeforeDays: dto.alertBeforeDays,
        alertBeforeKm: dto.alertBeforeKm,
        active: dto.active,
      },
    });
  }

  async findAll(
    userId: string,
    vehicleId: string,
    query: ListMaintenancePlansQueryDto,
  ): Promise<PaginatedPlans> {
    await this.ensureOwnedVehicle(userId, vehicleId);
    const where: Prisma.VehicleMaintenancePlanWhereInput = {
      userId,
      vehicleId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.active === undefined ? {} : { active: query.active }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicleMaintenancePlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.vehicleMaintenancePlan.count({ where }),
    ]);

    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(
    userId: string,
    vehicleId: string,
    id: string,
  ): Promise<VehicleMaintenancePlan> {
    await this.ensureOwnedVehicle(userId, vehicleId);
    return this.findOwnedPlan(userId, vehicleId, id);
  }

  async update(
    userId: string,
    vehicleId: string,
    id: string,
    dto: UpdateMaintenancePlanDto,
  ): Promise<VehicleMaintenancePlan> {
    await this.ensureOwnedVehicle(userId, vehicleId);
    const plan = await this.findOwnedPlan(userId, vehicleId, id);
    const intervalMonths =
      dto.intervalMonths === undefined
        ? plan.intervalMonths
        : dto.intervalMonths;
    const intervalKm =
      dto.intervalKm === undefined ? plan.intervalKm : dto.intervalKm;
    this.ensureInterval(intervalMonths, intervalKm);

    return this.prisma.vehicleMaintenancePlan.update({
      where: { id, userId, vehicleId, deletedAt: null },
      data: {
        name: dto.name,
        description: dto.description,
        category: dto.category,
        intervalMonths: dto.intervalMonths,
        intervalKm: dto.intervalKm,
        alertBeforeDays: dto.alertBeforeDays,
        alertBeforeKm: dto.alertBeforeKm,
        active: dto.active,
      },
    });
  }

  async remove(userId: string, vehicleId: string, id: string): Promise<void> {
    await this.ensureOwnedVehicle(userId, vehicleId);
    await this.findOwnedPlan(userId, vehicleId, id);
    await this.prisma.vehicleMaintenancePlan.update({
      where: { id, userId, vehicleId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureOwnedVehicle(
    userId: string,
    vehicleId: string,
  ): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, userId, deletedAt: null },
      select: { id: true },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
  }

  private async findOwnedPlan(
    userId: string,
    vehicleId: string,
    id: string,
  ): Promise<VehicleMaintenancePlan> {
    const plan = await this.prisma.vehicleMaintenancePlan.findFirst({
      where: { id, userId, vehicleId, deletedAt: null },
    });
    if (!plan) throw new NotFoundException('Maintenance plan not found');
    return plan;
  }

  private async findActiveTemplate(id: string): Promise<MaintenanceTemplate> {
    const template = await this.prisma.maintenanceTemplate.findFirst({
      where: { id, active: true },
    });
    if (!template) {
      throw new NotFoundException('Maintenance template not found');
    }
    return template;
  }

  private ensureInterval(
    intervalMonths: number | null | undefined,
    intervalKm: number | null | undefined,
  ): void {
    if (intervalMonths == null && intervalKm == null) {
      throw new BadRequestException(
        'At least one of intervalMonths or intervalKm is required',
      );
    }
  }
}
