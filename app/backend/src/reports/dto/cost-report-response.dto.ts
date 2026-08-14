import { ExpenseCategory } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CostReportPeriod } from './cost-report-query.dto';

export class ExpenseCategoryTotalDto {
  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.PARTS })
  category!: ExpenseCategory;

  @ApiProperty({ type: String, example: '125.50' })
  total!: string;
}

export class CostTotalsDto {
  @ApiProperty({
    type: String,
    example: '350.00',
    description: 'Sum of maintenance record totalCost values.',
  })
  serviceCost!: string;

  @ApiProperty({
    type: String,
    example: '125.50',
    description: 'Sum of standalone and maintenance-linked itemized expenses.',
  })
  additionalExpenses!: string;

  @ApiProperty({
    type: String,
    example: '125.50',
    description:
      'Itemized expenses linked to a maintenance record. Shown for detail and not added to total again.',
  })
  linkedItemizedExpenses!: string;

  @ApiProperty({
    type: String,
    example: '475.50',
    description: 'Service cost plus additional expenses.',
  })
  total!: string;

  @ApiProperty({ type: [ExpenseCategoryTotalDto] })
  expensesByCategory!: ExpenseCategoryTotalDto[];
}

export class CostReportBucketDto extends CostTotalsDto {
  @ApiProperty({
    example: '2026-08',
    description:
      'Calendar month (YYYY-MM) or year (YYYY) in the user timezone.',
  })
  period!: string;
}

export class CostReportResponseDto {
  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ enum: CostReportPeriod })
  period!: CostReportPeriod;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    description: 'Inclusive start instant normalized to UTC.',
  })
  from!: string | null;

  @ApiPropertyOptional({
    format: 'date-time',
    nullable: true,
    description: 'Inclusive end instant normalized to UTC.',
  })
  to!: string | null;

  @ApiProperty({ type: CostTotalsDto })
  summary!: CostTotalsDto;

  @ApiProperty({ type: [CostReportBucketDto] })
  buckets!: CostReportBucketDto[];
}
