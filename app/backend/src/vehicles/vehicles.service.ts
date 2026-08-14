import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OdometerReading,
  OdometerReadingSource,
  Prisma,
  Vehicle,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOdometerReadingDto,
  CreateVehicleDto,
  ListQueryDto,
  UpdateVehicleDto,
} from './dto';

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const recordedAt = new Date(dto.currentOdometerRecordedAt);

    return this.prisma.$transaction(async (transaction) => {
      const vehicle = await transaction.vehicle.create({
        data: {
          userId,
          nickname: dto.nickname,
          brand: dto.brand,
          model: dto.model,
          year: dto.year,
          licensePlate: dto.licensePlate,
          currentOdometerKm: dto.currentOdometerKm,
          currentOdometerRecordedAt: recordedAt,
        },
      });

      await transaction.odometerReading.create({
        data: {
          userId,
          vehicleId: vehicle.id,
          odometerKm: dto.currentOdometerKm,
          recordedAt,
          source: OdometerReadingSource.MANUAL,
        },
      });

      return vehicle;
    });
  }

  async findAll(
    userId: string,
    query: ListQueryDto,
  ): Promise<PaginatedResult<Vehicle>> {
    const where: Prisma.VehicleWhereInput = { userId, deletedAt: null };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.vehicle.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return this.paginate(data, total, query);
  }

  async findOne(userId: string, id: string): Promise<Vehicle> {
    return this.findOwnedVehicle(this.prisma, userId, id);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateVehicleDto,
  ): Promise<Vehicle> {
    await this.findOwnedVehicle(this.prisma, userId, id);

    return this.prisma.vehicle.update({
      where: { id, userId, deletedAt: null },
      data: dto,
    });
  }

  async remove(userId: string, id: string): Promise<void> {
    await this.findOwnedVehicle(this.prisma, userId, id);

    await this.prisma.vehicle.update({
      where: { id, userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async createOdometerReading(
    userId: string,
    vehicleId: string,
    dto: CreateOdometerReadingDto,
  ): Promise<OdometerReading> {
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          async (transaction) => {
            const vehicle = await this.findOwnedVehicle(
              transaction,
              userId,
              vehicleId,
            );

            if (
              dto.odometerKm < vehicle.currentOdometerKm &&
              dto.confirmLowerReading !== true
            ) {
              throw new BadRequestException(
                'A lower odometer reading requires explicit confirmation',
              );
            }

            const recordedAt = new Date(dto.recordedAt);
            const reading = await transaction.odometerReading.create({
              data: {
                userId,
                vehicleId,
                odometerKm: dto.odometerKm,
                recordedAt,
                source: OdometerReadingSource.MANUAL,
              },
            });

            const advancesReference =
              dto.odometerKm >= vehicle.currentOdometerKm &&
              recordedAt >= vehicle.currentOdometerRecordedAt;

            if (advancesReference) {
              await transaction.vehicle.update({
                where: { id: vehicleId, userId, deletedAt: null },
                data: {
                  currentOdometerKm: dto.odometerKm,
                  currentOdometerRecordedAt: recordedAt,
                },
              });
            }

            return reading;
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error: unknown) {
        const isWriteConflict =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2034';
        if (!isWriteConflict || attempt === 3) throw error;
      }
    }

    throw new Error('Unreachable transaction retry state');
  }

  async findOdometerReadings(
    userId: string,
    vehicleId: string,
    query: ListQueryDto,
  ): Promise<PaginatedResult<OdometerReading>> {
    await this.findOwnedVehicle(this.prisma, userId, vehicleId);
    const where: Prisma.OdometerReadingWhereInput = { userId, vehicleId };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.odometerReading.findMany({
        where,
        orderBy: [{ recordedAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.odometerReading.count({ where }),
    ]);

    return this.paginate(data, total, query);
  }

  private async findOwnedVehicle(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
    id: string,
  ): Promise<Vehicle> {
    const vehicle = await client.vehicle.findFirst({
      where: { id, userId, deletedAt: null },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  private paginate<T>(
    data: T[],
    total: number,
    query: ListQueryDto,
  ): PaginatedResult<T> {
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
}
