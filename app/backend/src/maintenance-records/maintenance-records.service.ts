import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExpenseCategory,
  OdometerReadingSource,
  Prisma,
  Vehicle,
  VehicleMaintenancePlan,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CompleteMaintenancePlanDto,
  CreateMaintenanceRecordDto,
  ListMaintenanceRecordsQueryDto,
  UpdateMaintenanceRecordDto,
} from './dto';

export interface PaginatedMaintenanceRecords {
  data: MaintenanceRecordWithCostItems[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface RecordInput {
  planId?: string;
  description: string;
  performedAt: string;
  odometerKm: number;
  workshop?: string;
  notes?: string;
  totalCost: string;
  costItems?: Array<{
    category: ExpenseCategory;
    description: string;
    amount: string;
  }>;
}

type MaintenanceRecordWithCostItems = Prisma.MaintenanceRecordGetPayload<{
  include: typeof RECORD_INCLUDE;
}>;

const RECORD_INCLUDE = {
  costItems: { orderBy: { createdAt: 'asc' as const } },
} satisfies Prisma.MaintenanceRecordInclude;

@Injectable()
export class MaintenanceRecordsService {
  private static readonly MAX_TRANSACTION_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    vehicleId: string,
    dto: CreateMaintenanceRecordDto,
  ): Promise<MaintenanceRecordWithCostItems> {
    return this.withSerializableRetry(async (transaction) => {
      const vehicle = await this.findOwnedVehicle(
        transaction,
        userId,
        vehicleId,
      );

      if (dto.planId) {
        await this.findOwnedPlan(
          transaction,
          userId,
          vehicleId,
          dto.planId,
          false,
        );
      }

      const record = await this.createRecordWithReading(
        transaction,
        userId,
        vehicle,
        dto,
      );
      if (dto.planId) {
        await this.synchronizePlanReference(
          transaction,
          userId,
          vehicleId,
          dto.planId,
        );
      }
      return record;
    });
  }

  async completePlan(
    userId: string,
    vehicleId: string,
    planId: string,
    dto: CompleteMaintenancePlanDto,
  ): Promise<MaintenanceRecordWithCostItems> {
    return this.withSerializableRetry(async (transaction) => {
      const vehicle = await this.findOwnedVehicle(
        transaction,
        userId,
        vehicleId,
      );
      const plan = await this.findOwnedPlan(
        transaction,
        userId,
        vehicleId,
        planId,
        true,
      );
      const input: RecordInput = {
        ...dto,
        planId,
        description: dto.description ?? plan.name,
      };
      const record = await this.createRecordWithReading(
        transaction,
        userId,
        vehicle,
        input,
      );

      await this.synchronizePlanReference(
        transaction,
        userId,
        vehicleId,
        planId,
      );

      return record;
    });
  }

  async findAll(
    userId: string,
    vehicleId: string,
    query: ListMaintenanceRecordsQueryDto,
  ): Promise<PaginatedMaintenanceRecords> {
    await this.findOwnedVehicle(this.prisma, userId, vehicleId);
    const where: Prisma.MaintenanceRecordWhereInput = {
      userId,
      vehicleId,
      deletedAt: null,
      ...(query.planId ? { planId: query.planId } : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.maintenanceRecord.findMany({
        where,
        orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
        include: RECORD_INCLUDE,
        skip,
        take: query.limit,
      }),
      this.prisma.maintenanceRecord.count({ where }),
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
    recordId: string,
  ): Promise<MaintenanceRecordWithCostItems> {
    await this.findOwnedVehicle(this.prisma, userId, vehicleId);
    return this.findOwnedRecord(this.prisma, userId, vehicleId, recordId);
  }

  async update(
    userId: string,
    vehicleId: string,
    recordId: string,
    dto: UpdateMaintenanceRecordDto,
  ): Promise<MaintenanceRecordWithCostItems> {
    return this.withSerializableRetry(async (transaction) => {
      await this.findOwnedVehicle(transaction, userId, vehicleId);
      const current = await this.findOwnedRecord(
        transaction,
        userId,
        vehicleId,
        recordId,
      );

      if (dto.planId) {
        await this.findOwnedPlan(
          transaction,
          userId,
          vehicleId,
          dto.planId,
          false,
        );
      }

      const performedAt = dto.performedAt
        ? new Date(dto.performedAt)
        : current.performedAt;
      const odometerKm = dto.odometerKm ?? current.odometerKm;
      const data: Prisma.MaintenanceRecordUncheckedUpdateInput = {
        ...(dto.planId !== undefined ? { planId: dto.planId } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.performedAt !== undefined ? { performedAt } : {}),
        ...(dto.odometerKm !== undefined ? { odometerKm } : {}),
        ...(dto.workshop !== undefined ? { workshop: dto.workshop } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        ...(dto.totalCost !== undefined || dto.costItems !== undefined
          ? { totalCost: this.recordTotalCost(dto) }
          : {}),
      };

      if (current.odometerReadingId) {
        if (dto.performedAt !== undefined || dto.odometerKm !== undefined) {
          await transaction.odometerReading.update({
            where: { id: current.odometerReadingId },
            data: {
              ...(dto.performedAt !== undefined
                ? { recordedAt: performedAt }
                : {}),
              ...(dto.odometerKm !== undefined ? { odometerKm } : {}),
            },
          });
        }
      } else {
        const reading = await transaction.odometerReading.create({
          data: {
            userId,
            vehicleId,
            odometerKm,
            recordedAt: performedAt,
            source: OdometerReadingSource.MAINTENANCE_RECORD,
          },
        });
        data.odometerReadingId = reading.id;
      }

      const record = await transaction.maintenanceRecord.update({
        where: { id: recordId, userId, vehicleId, deletedAt: null },
        data,
        include: RECORD_INCLUDE,
      });
      if (dto.costItems !== undefined) {
        await transaction.maintenanceRecordCostItem.deleteMany({
          where: { maintenanceRecordId: recordId },
        });
        await transaction.maintenanceRecordCostItem.createMany({
          data: this.recordCostItems(dto).map((item) => ({
            maintenanceRecordId: recordId,
            ...item,
          })),
        });
      }
      const affectedPlanIds = new Set(
        [current.planId, record.planId].filter(
          (planId): planId is string => planId !== null,
        ),
      );
      for (const planId of affectedPlanIds) {
        await this.synchronizePlanReference(
          transaction,
          userId,
          vehicleId,
          planId,
        );
      }
      if (dto.performedAt !== undefined || dto.odometerKm !== undefined) {
        await this.synchronizeVehicleReference(transaction, userId, vehicleId);
      }

      return dto.costItems === undefined
        ? record
        : this.findOwnedRecord(transaction, userId, vehicleId, recordId);
    });
  }

  async remove(
    userId: string,
    vehicleId: string,
    recordId: string,
  ): Promise<void> {
    await this.withSerializableRetry(async (transaction) => {
      await this.findOwnedVehicle(transaction, userId, vehicleId);
      const record = await this.findOwnedRecord(
        transaction,
        userId,
        vehicleId,
        recordId,
      );
      const linkedExpenses = await transaction.expense.count({
        where: {
          userId,
          vehicleId,
          maintenanceRecordId: recordId,
          deletedAt: null,
        },
      });
      if (linkedExpenses > 0) {
        throw new ConflictException(
          'Delete or unlink active expenses before deleting this maintenance record',
        );
      }
      await transaction.maintenanceRecord.update({
        where: { id: recordId, userId, vehicleId, deletedAt: null },
        data: {
          deletedAt: new Date(),
          ...(record.odometerReadingId ? { odometerReadingId: null } : {}),
        },
      });
      if (record.odometerReadingId) {
        await transaction.odometerReading.delete({
          where: { id: record.odometerReadingId },
        });
        await this.synchronizeVehicleReference(transaction, userId, vehicleId);
      }
      if (record.planId) {
        await this.synchronizePlanReference(
          transaction,
          userId,
          vehicleId,
          record.planId,
        );
      }
    });
  }

  private async synchronizePlanReference(
    transaction: Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
    planId: string,
  ): Promise<void> {
    const latest = await transaction.maintenanceRecord.findFirst({
      where: { userId, vehicleId, planId, deletedAt: null },
      orderBy: [{ performedAt: 'desc' }, { createdAt: 'desc' }],
      select: { performedAt: true, odometerKm: true },
    });
    await transaction.vehicleMaintenancePlan.updateMany({
      where: { id: planId, userId, vehicleId, deletedAt: null },
      data: {
        lastPerformedAt: latest?.performedAt ?? null,
        lastPerformedOdometerKm: latest?.odometerKm ?? null,
      },
    });
  }

  private async createRecordWithReading(
    transaction: Prisma.TransactionClient,
    userId: string,
    vehicle: Vehicle,
    input: RecordInput,
  ): Promise<MaintenanceRecordWithCostItems> {
    const performedAt = new Date(input.performedAt);
    const record = await transaction.maintenanceRecord.create({
      data: {
        userId,
        vehicleId: vehicle.id,
        planId: input.planId,
        description: input.description,
        performedAt,
        odometerKm: input.odometerKm,
        workshop: input.workshop,
        notes: input.notes,
        totalCost: this.recordTotalCost(input),
        costItems: {
          createMany: {
            data: this.recordCostItems(input),
          },
        },
      },
    });
    const reading = await transaction.odometerReading.create({
      data: {
        userId,
        vehicleId: vehicle.id,
        odometerKm: input.odometerKm,
        recordedAt: performedAt,
        source: OdometerReadingSource.MAINTENANCE_RECORD,
      },
    });
    const linkedRecord = await transaction.maintenanceRecord.update({
      where: { id: record.id },
      data: { odometerReadingId: reading.id },
      include: RECORD_INCLUDE,
    });

    await this.advanceVehicleReference(
      transaction,
      userId,
      vehicle,
      input.odometerKm,
      performedAt,
    );

    return linkedRecord;
  }

  private async advanceVehicleReference(
    transaction: Prisma.TransactionClient,
    userId: string,
    vehicle: Vehicle,
    odometerKm: number,
    recordedAt: Date,
  ): Promise<void> {
    if (
      odometerKm < vehicle.currentOdometerKm ||
      recordedAt < vehicle.currentOdometerRecordedAt
    ) {
      return;
    }

    await transaction.vehicle.update({
      where: { id: vehicle.id, userId, deletedAt: null },
      data: {
        currentOdometerKm: odometerKm,
        currentOdometerRecordedAt: recordedAt,
      },
    });
  }

  private async synchronizeVehicleReference(
    transaction: Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
  ): Promise<void> {
    const readings = await transaction.odometerReading.findMany({
      where: { userId, vehicleId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      select: { odometerKm: true, recordedAt: true },
    });
    const reference = readings.reduce<
      { odometerKm: number; recordedAt: Date } | undefined
    >((current, reading) => {
      if (
        !current ||
        (reading.odometerKm >= current.odometerKm &&
          reading.recordedAt >= current.recordedAt)
      ) {
        return reading;
      }
      return current;
    }, undefined);
    if (!reference) return;

    await transaction.vehicle.update({
      where: { id: vehicleId, userId, deletedAt: null },
      data: {
        currentOdometerKm: reference.odometerKm,
        currentOdometerRecordedAt: reference.recordedAt,
      },
    });
  }

  private async findOwnedVehicle(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
  ): Promise<Vehicle> {
    const vehicle = await client.vehicle.findFirst({
      where: { id: vehicleId, userId, deletedAt: null },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async findOwnedPlan(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
    planId: string,
    requireActive: boolean,
  ): Promise<VehicleMaintenancePlan> {
    const plan = await client.vehicleMaintenancePlan.findFirst({
      where: {
        id: planId,
        userId,
        vehicleId,
        deletedAt: null,
        ...(requireActive ? { active: true } : {}),
      },
    });
    if (!plan) throw new NotFoundException('Maintenance plan not found');
    return plan;
  }

  private async findOwnedRecord(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
    recordId: string,
  ): Promise<MaintenanceRecordWithCostItems> {
    const record = await client.maintenanceRecord.findFirst({
      where: { id: recordId, userId, vehicleId, deletedAt: null },
      include: RECORD_INCLUDE,
    });
    if (!record) throw new NotFoundException('Maintenance record not found');
    return record;
  }

  private recordCostItems(input: {
    description?: string;
    totalCost?: string;
    costItems?: RecordInput['costItems'];
  }): Prisma.MaintenanceRecordCostItemCreateManyMaintenanceRecordInput[] {
    const items =
      input.costItems ??
      (input.totalCost
        ? [
            {
              category: ExpenseCategory.OTHER,
              description: input.description ?? 'Maintenance service',
              amount: input.totalCost,
            },
          ]
        : []);

    return items.map((item) => ({
      category: item.category,
      description: item.description,
      amount: new Prisma.Decimal(item.amount),
    }));
  }

  private recordTotalCost(input: {
    totalCost?: string;
    costItems?: RecordInput['costItems'];
  }): Prisma.Decimal {
    if (!input.costItems) return new Prisma.Decimal(input.totalCost ?? '0');
    return input.costItems.reduce(
      (total, item) => total.plus(item.amount),
      new Prisma.Decimal(0),
    );
  }

  private async withSerializableRetry<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (
      let attempt = 1;
      attempt <= MaintenanceRecordsService.MAX_TRANSACTION_ATTEMPTS;
      attempt += 1
    ) {
      try {
        return await this.prisma.$transaction(operation, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        const isWriteConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (
          !isWriteConflict ||
          attempt === MaintenanceRecordsService.MAX_TRANSACTION_ATTEMPTS
        ) {
          throw error;
        }
      }
    }

    throw new Error('Unreachable transaction retry state');
  }
}
