import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceCategory } from '@prisma/client';

export class MaintenancePlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  templateId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MaintenanceCategory })
  category!: MaintenanceCategory;

  @ApiPropertyOptional({ nullable: true })
  intervalMonths!: number | null;

  @ApiPropertyOptional({ nullable: true })
  intervalKm!: number | null;

  @ApiProperty()
  alertBeforeDays!: number;

  @ApiProperty()
  alertBeforeKm!: number;

  @ApiPropertyOptional({ format: 'date-time', nullable: true })
  lastPerformedAt!: Date | null;

  @ApiPropertyOptional({ nullable: true })
  lastPerformedOdometerKm!: number | null;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class MaintenancePlanPaginationMetaDto {
  @ApiProperty() page!: number;
  @ApiProperty() limit!: number;
  @ApiProperty() total!: number;
  @ApiProperty() totalPages!: number;
}
