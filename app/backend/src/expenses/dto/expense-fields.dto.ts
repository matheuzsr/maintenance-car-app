import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const DECIMAL_AMOUNT_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;
export const TIMESTAMP_WITH_OFFSET_PATTERN =
  /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/;

export class ExpenseFieldsDto {
  @ApiProperty({ enum: ExpenseCategory, example: ExpenseCategory.PARTS })
  @IsEnum(ExpenseCategory)
  category!: ExpenseCategory;

  @ApiProperty({ example: 'Replacement brake pads', maxLength: 500 })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: '2026-08-13T12:00:00.000-03:00' })
  @IsDateString({ strict: true })
  @Matches(TIMESTAMP_WITH_OFFSET_PATTERN, {
    message: 'incurredAt must include time and UTC offset',
  })
  incurredAt!: string;

  @ApiProperty({
    type: String,
    example: '249.90',
    description:
      'Non-negative decimal value sent as a string with up to two decimal places.',
    pattern: DECIMAL_AMOUNT_PATTERN.source,
  })
  @IsString()
  @Matches(DECIMAL_AMOUNT_PATTERN)
  amount!: string;

  @ApiPropertyOptional({
    example: 'Purchased directly from the manufacturer',
    maxLength: 2000,
  })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
