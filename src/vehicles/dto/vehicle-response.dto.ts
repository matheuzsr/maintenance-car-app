import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VehicleResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Meu carro' })
  nickname!: string;

  @ApiProperty({ example: 'Fiat' })
  brand!: string;

  @ApiProperty({ example: 'Argo' })
  model!: string;

  @ApiProperty({ example: 2022 })
  year!: number;

  @ApiPropertyOptional({ example: 'ABC1D23', nullable: true })
  licensePlate!: string | null;

  @ApiProperty({ example: 76808 })
  currentOdometerKm!: number;

  @ApiProperty({ format: 'date-time' })
  currentOdometerRecordedAt!: Date;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}

export class OdometerReadingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  vehicleId!: string;

  @ApiProperty({ example: 76808 })
  odometerKm!: number;

  @ApiProperty({ format: 'date-time' })
  recordedAt!: Date;

  @ApiProperty({ enum: ['MANUAL', 'MAINTENANCE_RECORD'] })
  source!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;
}

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 1 })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
