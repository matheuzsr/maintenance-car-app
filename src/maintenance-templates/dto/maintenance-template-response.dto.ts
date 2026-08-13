import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceCategory } from '@prisma/client';

export class MaintenanceTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'engine-oil' })
  slug!: string;

  @ApiProperty({ example: 'Troca de óleo do motor' })
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MaintenanceCategory })
  category!: MaintenanceCategory;

  @ApiPropertyOptional({ example: 12, nullable: true })
  suggestedIntervalMonths!: number | null;

  @ApiPropertyOptional({ example: 10000, nullable: true })
  suggestedIntervalKm!: number | null;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
