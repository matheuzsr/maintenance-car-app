import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { MaintenanceRecordFieldsDto } from './maintenance-record-fields.dto';

export class CreateMaintenanceRecordDto extends MaintenanceRecordFieldsDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Plan associated with this record. The latest active linked record becomes the plan reference.',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
