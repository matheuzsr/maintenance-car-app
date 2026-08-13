import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export const DECIMAL_COST_PATTERN = /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/;

export class MaintenanceRecordFieldsDto {
  @ApiProperty({ example: 'Troca de óleo e filtro', maxLength: 500 })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: '2026-08-13T12:00:00.000Z' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/, {
    message: 'performedAt must include time and UTC offset',
  })
  performedAt!: string;

  @ApiProperty({ example: 76808, minimum: 0 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  odometerKm!: number;

  @ApiPropertyOptional({ example: 'Oficina do bairro', maxLength: 120 })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(120)
  workshop?: string;

  @ApiPropertyOptional({
    example: 'Filtro original utilizado',
    maxLength: 2000,
  })
  @Transform(({ value }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @ApiProperty({
    example: '350.00',
    type: String,
    description:
      'Valor decimal não negativo, enviado como string com no máximo duas casas decimais.',
    pattern: DECIMAL_COST_PATTERN.source,
  })
  @IsString()
  @Matches(DECIMAL_COST_PATTERN)
  totalCost!: string;
}
