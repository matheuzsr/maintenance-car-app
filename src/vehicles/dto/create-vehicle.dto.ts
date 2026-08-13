import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty({ example: 'Meu carro' })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  nickname!: string;

  @ApiProperty({ example: 'Honda' })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  brand!: string;

  @ApiProperty({ example: 'Civic' })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(80)
  model!: string;

  @ApiProperty({ example: 2022, minimum: 1886, maximum: 2200 })
  @Type(() => Number)
  @IsInt()
  @Min(1886)
  @Max(2200)
  year!: number;

  @ApiPropertyOptional({ example: 'ABC1D23' })
  @Transform(({ value }): unknown =>
    typeof value === 'string'
      ? value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
      : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(20)
  licensePlate?: string;

  @ApiProperty({ example: 45000, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  currentOdometerKm!: number;

  @ApiProperty({ example: '2026-08-13T12:00:00.000Z' })
  @IsDateString({ strict: true })
  currentOdometerRecordedAt!: string;
}
