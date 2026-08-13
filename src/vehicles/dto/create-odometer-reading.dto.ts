import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';

export class CreateOdometerReadingDto {
  @ApiProperty({ example: 45500, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerKm!: number;

  @ApiProperty({ example: '2026-08-13T12:00:00.000Z' })
  @IsDateString({ strict: true })
  recordedAt!: string;

  @ApiPropertyOptional({
    default: false,
    description:
      'Confirma o registro de uma leitura inferior à referência atual sem reduzi-la.',
  })
  @IsOptional()
  @IsBoolean()
  confirmLowerReading?: boolean;
}
