import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceRecord,
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
  data: MaintenanceRecord[];
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
}

@Injectable()
export class MaintenanceRecordsService {
  private static readonly MAX_TRANSACTION_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    vehicleId: string,
    dto: CreateMaintenanceRecordDto,
  ): Promise<MaintenanceRecord> {
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

      return this.createRecordWithReading(transaction, userId, vehicle, dto);
    });
  }

  async completePlan(
    userId: string,
    vehicleId: string,
    planId: string,
    dto: CompleteMaintenancePlanDto,
  ): Promise<MaintenanceRecord> {
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

      await transaction.vehicleMaintenancePlan.update({
        where: { id: planId, userId, vehicleId, deletedAt: null },
        data: {
          lastPerformedAt: new Date(dto.performedAt),
          lastPerformedOdometerKm: dto.odometerKm,
        },
      });

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
  ): Promise<MaintenanceRecord> {
    await this.findOwnedVehicle(this.prisma, userId, vehicleId);
    return this.findOwnedRecord(this.prisma, userId, vehicleId, recordId);
  }

  async update(
    userId: string,
    vehicleId: string,
    recordId: string,
    dto: UpdateMaintenanceRecordDto,
  ): Promise<MaintenanceRecord> {
    return this.withSerializableRetry(async (transaction) => {
      const vehicle = await this.findOwnedVehicle(
        transaction,
        userId,
        vehicleId,
      );
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
        ...(dto.totalCost !== undefined
          ? { totalCost: new Prisma.Decimal(dto.totalCost) }
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
      });
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
      await this.advanceVehicleReference(
        transaction,
        userId,
        vehicle,
        odometerKm,
        performedAt,
      );

      return record;
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
        data: { deletedAt: new Date() },
      });
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
  ): Promise<MaintenanceRecord> {
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
        totalCost: new Prisma.Decimal(input.totalCost),
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
  ): Promise<MaintenanceRecord> {
    const record = await client.maintenanceRecord.findFirst({
      where: { id: recordId, userId, vehicleId, deletedAt: null },
    });
    if (!record) throw new NotFoundException('Maintenance record not found');
    return record;
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
