import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { DueStatus } from './maintenance-status';

export class AgendaQueryDto {
  @ApiPropertyOptional({ enum: DueStatus })
  @IsOptional()
  @IsEnum(DueStatus)
  status?: DueStatus;
}
