import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsDateString,
  IsEnum,
  IsInt,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export const DECIMAL_COST_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export class MaintenanceRecordCostItemFieldsDto {
  @ApiProperty({
    enum: ExpenseCategory,
    example: ExpenseCategory.PARTS,
    description: 'Cost category for this maintenance item.',
  })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Oil filter', maxLength: 500 })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    example: '80.00',
    type: String,
    pattern: DECIMAL_COST_PATTERN.source,
  })
  @IsString()
  @Matches(DECIMAL_COST_PATTERN)
  amount!: string;
}

export class MaintenanceRecordFieldsDto {
  @ApiProperty({ example: 'Oil and filter change', maxLength: 500 })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({
    example: '2026-08-13T12:00:00.000Z',
    format: 'date-time',
  })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'performedAt must include time and UTC offset',
  })
  performedAt!: string;

  @ApiProperty({ example: 76808, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerKm!: number;

  @ApiPropertyOptional({ example: 'Local repair shop', maxLength: 120 })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workshop?: string;

  @ApiPropertyOptional({
    example: 'Original filter used',
    maxLength: 2000,
  })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    example: '350.00',
    type: String,
    description:
      'Non-negative decimal value sent as a string with up to two decimal places.',
    pattern: DECIMAL_COST_PATTERN.source,
  })
  @IsString()
  @Matches(DECIMAL_COST_PATTERN)
  totalCost!: string;

  @ApiPropertyOptional({
    type: [MaintenanceRecordCostItemFieldsDto],
    minItems: 1,
    maxItems: 50,
    description:
      'Optional itemized costs for this maintenance. When provided, totalCost is recalculated from the item amounts.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MaintenanceRecordCostItemFieldsDto)
  costItems?: MaintenanceRecordCostItemFieldsDto[];
}
