import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MaintenanceRecordResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  planId!: string | null;

  @ApiPropertyOptional({ format: 'uuid', nullable: true })
  odometerReadingId!: string | null;

  @ApiProperty({ example: 'Troca de óleo e filtro' })
  description!: string;

  @ApiProperty({ format: 'date-time' })
  performedAt!: Date;

  @ApiProperty({ example: 76808 })
  odometerKm!: number;

  @ApiPropertyOptional({ nullable: true, example: 'Oficina do bairro' })
  workshop!: string | null;

  @ApiPropertyOptional({ nullable: true })
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
