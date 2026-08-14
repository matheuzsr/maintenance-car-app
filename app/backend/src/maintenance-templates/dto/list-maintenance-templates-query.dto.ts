import { ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenanceCategory } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListMaintenanceTemplatesQueryDto {
  @ApiPropertyOptional({ enum: MaintenanceCategory })
  @IsOptional()
  @IsEnum(MaintenanceCategory)
  category?: MaintenanceCategory;
}
