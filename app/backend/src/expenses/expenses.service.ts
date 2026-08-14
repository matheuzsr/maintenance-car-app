import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Expense, MaintenanceRecord, Prisma, Vehicle } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateExpenseDto,
  ListExpensesQueryDto,
  UpdateExpenseDto,
} from './dto';

export interface PaginatedExpenses {
  data: Expense[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class ExpensesService {
  private static readonly MAX_TRANSACTION_ATTEMPTS = 3;

  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    vehicleId: string,
    dto: CreateExpenseDto,
  ): Promise<Expense> {
    return this.withSerializableRetry(async (transaction) => {
      await this.findOwnedVehicle(transaction, userId, vehicleId);
      if (dto.maintenanceRecordId) {
        await this.findOwnedMaintenanceRecord(
          transaction,
          userId,
          vehicleId,
          dto.maintenanceRecordId,
        );
      }
      return transaction.expense.create({
        data: {
          userId,
          vehicleId,
          maintenanceRecordId: dto.maintenanceRecordId,
          category: dto.category,
          description: dto.description,
          incurredAt: new Date(dto.incurredAt),
          amount: new Prisma.Decimal(dto.amount),
          notes: dto.notes,
        },
      });
    });
  }

  async findAll(
    userId: string,
    vehicleId: string,
    query: ListExpensesQueryDto,
  ): Promise<PaginatedExpenses> {
    await this.findOwnedVehicle(this.prisma, userId, vehicleId);
    if (
      query.incurredFrom &&
      query.incurredTo &&
      new Date(query.incurredFrom) > new Date(query.incurredTo)
    ) {
      throw new BadRequestException(
        'incurredFrom must be earlier than or equal to incurredTo',
      );
    }
    const where: Prisma.ExpenseWhereInput = {
      userId,
      vehicleId,
      deletedAt: null,
      ...(query.category ? { category: query.category } : {}),
      ...(query.incurredFrom || query.incurredTo
        ? {
            incurredAt: {
              ...(query.incurredFrom
                ? { gte: new Date(query.incurredFrom) }
                : {}),
              ...(query.incurredTo ? { lte: new Date(query.incurredTo) } : {}),
            },
          }
        : {}),
    };
    const skip = (query.page - 1) * query.limit;
    const [data, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        orderBy: [{ incurredAt: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: query.limit,
      }),
      this.prisma.expense.count({ where }),
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
    expenseId: string,
  ): Promise<Expense> {
    await this.findOwnedVehicle(this.prisma, userId, vehicleId);
    return this.findOwnedExpense(this.prisma, userId, vehicleId, expenseId);
  }

  async update(
    userId: string,
    vehicleId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ): Promise<Expense> {
    return this.withSerializableRetry(async (transaction) => {
      await this.findOwnedVehicle(transaction, userId, vehicleId);
      await this.findOwnedExpense(transaction, userId, vehicleId, expenseId);
      if (dto.maintenanceRecordId) {
        await this.findOwnedMaintenanceRecord(
          transaction,
          userId,
          vehicleId,
          dto.maintenanceRecordId,
        );
      }
      return transaction.expense.update({
        where: { id: expenseId, userId, vehicleId, deletedAt: null },
        data: {
          ...(dto.maintenanceRecordId !== undefined
            ? { maintenanceRecordId: dto.maintenanceRecordId }
            : {}),
          ...(dto.category !== undefined ? { category: dto.category } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.incurredAt !== undefined
            ? { incurredAt: new Date(dto.incurredAt) }
            : {}),
          ...(dto.amount !== undefined
            ? { amount: new Prisma.Decimal(dto.amount) }
            : {}),
          ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        },
      });
    });
  }

  async remove(
    userId: string,
    vehicleId: string,
    expenseId: string,
  ): Promise<void> {
    await this.withSerializableRetry(async (transaction) => {
      await this.findOwnedVehicle(transaction, userId, vehicleId);
      await this.findOwnedExpense(transaction, userId, vehicleId, expenseId);
      await transaction.expense.update({
        where: { id: expenseId, userId, vehicleId, deletedAt: null },
        data: { deletedAt: new Date() },
      });
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

  private async findOwnedMaintenanceRecord(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
    maintenanceRecordId: string,
  ): Promise<MaintenanceRecord> {
    const record = await client.maintenanceRecord.findFirst({
      where: {
        id: maintenanceRecordId,
        userId,
        vehicleId,
        deletedAt: null,
      },
    });
    if (!record) throw new NotFoundException('Maintenance record not found');
    return record;
  }

  private async findOwnedExpense(
    client: PrismaService | Prisma.TransactionClient,
    userId: string,
    vehicleId: string,
    expenseId: string,
  ): Promise<Expense> {
    const expense = await client.expense.findFirst({
      where: { id: expenseId, userId, vehicleId, deletedAt: null },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  private async withSerializableRetry<T>(
    operation: (transaction: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    for (
      let attempt = 1;
      attempt <= ExpensesService.MAX_TRANSACTION_ATTEMPTS;
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
          attempt === ExpensesService.MAX_TRANSACTION_ATTEMPTS
        )
          throw error;
      }
    }
    throw new Error('Unreachable transaction retry state');
  }
}
