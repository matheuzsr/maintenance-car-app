import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';

export enum CostReportPeriod {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

const ISO_DATE_TIME_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/;

export class CostReportQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Vehicle included in the report.',
  })
  @IsUUID()
  vehicleId!: string;

  @ApiProperty({
    enum: CostReportPeriod,
    description: 'Calendar interval used to group costs in the user timezone.',
  })
  @IsEnum(CostReportPeriod)
  period!: CostReportPeriod;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-01-01T00:00:00-03:00',
    description: 'Inclusive start instant. A UTC offset is required.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(ISO_DATE_TIME_WITH_OFFSET, {
    message: 'from must include time and UTC offset',
  })
  from?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-12-31T23:59:59-03:00',
    description: 'Inclusive end instant. A UTC offset is required.',
  })
  @IsOptional()
  @IsDateString({ strict: true })
  @Matches(ISO_DATE_TIME_WITH_OFFSET, {
    message: 'to must include time and UTC offset',
  })
  to?: string;
}
