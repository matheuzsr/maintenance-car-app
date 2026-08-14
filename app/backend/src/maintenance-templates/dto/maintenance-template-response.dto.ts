import { ApiProperty } from '@nestjs/swagger';
import { MaintenanceCategory } from '@prisma/client';

export class MaintenanceTemplateResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'engine-oil' })
  slug!: string;

  @ApiProperty({ example: 'Engine oil change' })
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  description!: string | null;

  @ApiProperty({ enum: MaintenanceCategory })
  category!: MaintenanceCategory;

  @ApiProperty({ type: Number, example: 12, nullable: true })
  suggestedIntervalMonths!: number | null;

  @ApiProperty({ type: Number, example: 10000, nullable: true })
  suggestedIntervalKm!: number | null;

  @ApiProperty({ example: true })
  active!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: Date;
}
