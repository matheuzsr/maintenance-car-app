import { ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { TIMESTAMP_WITH_OFFSET_PATTERN } from './expense-fields.dto';

export class ListExpensesQueryDto {
  @ApiPropertyOptional({ type: Number, default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ type: Number, default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ enum: ExpenseCategory })
  @IsOptional()
  @IsEnum(ExpenseCategory)
  category?: ExpenseCategory;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Includes expenses incurred at or after this timestamp.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(TIMESTAMP_WITH_OFFSET_PATTERN, {
    message: 'incurredFrom must include time and UTC offset',
  })
  incurredFrom?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Includes expenses incurred at or before this timestamp.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(TIMESTAMP_WITH_OFFSET_PATTERN, {
    message: 'incurredTo must include time and UTC offset',
  })
  incurredTo?: string;
}
