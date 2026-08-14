import { ApiProperty } from '@nestjs/swagger';

export class MaintenanceRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  planId!: string | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  odometerReadingId!: string | null;

  @ApiProperty({ example: 'Oil and filter change' })
  description!: string;

  @ApiProperty({ format: 'date-time' })
  performedAt!: Date;

  @ApiProperty({ example: 76808 })
  odometerKm!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Local repair shop',
  })
  workshop!: string | null;

  @ApiProperty({ type: String, nullable: true })
  notes!: string | null;

  @ApiProperty({ type: String, example: '350.00' })
  totalCost!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class MaintenanceRecordPaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class MaintenanceRecordListResponseDto {
  @ApiProperty({ type: [MaintenanceRecordResponseDto] })
  data!: MaintenanceRecordResponseDto[];

  @ApiProperty({ type: MaintenanceRecordPaginationMetaDto })
  meta!: MaintenanceRecordPaginationMetaDto;
}
