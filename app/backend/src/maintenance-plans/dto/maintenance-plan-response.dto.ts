import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceCategory } from '@prisma/client';

export class MaintenancePlanResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  templateId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MaintenanceCategory })
  category!: MaintenanceCategory;

  @ApiProperty({ type: Number, nullable: true })
  intervalMonths!: number | null;

  @ApiProperty({ type: Number, nullable: true })
  intervalKm!: number | null;

  @ApiProperty()
  alertBeforeDays!: number;

  @ApiProperty()
  alertBeforeKm!: number;

  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastPerformedAt!: Date | null;

  @ApiProperty({ type: Number, nullable: true })
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
