import { ApiProperty } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';

export class ExpenseItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  expenseId!: string;

  @ApiProperty({ enum: ExpenseCategory })
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Brake pads' })
  description!: string;

  @ApiProperty({ type: String, example: '199.90' })
  amount!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class ExpenseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  maintenanceRecordId!: string | null;

  @ApiProperty({ enum: ExpenseCategory })
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Replacement brake pads' })
  description!: string;

  @ApiProperty({ format: 'date-time' })
  incurredAt!: Date;

  @ApiProperty({ type: String, example: '249.90' })
  amount!: string;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: [ExpenseItemResponseDto] })
  items!: ExpenseItemResponseDto[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class ExpensePaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedExpensesResponseDto {
  @ApiProperty({ type: [ExpenseResponseDto] })
  data!: ExpenseResponseDto[];

  @ApiProperty({ type: ExpensePaginationMetaDto })
  meta!: ExpensePaginationMetaDto;
}
