import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { MaintenanceRecordFieldsDto } from './maintenance-record-fields.dto';

export class CreateMaintenanceRecordDto extends MaintenanceRecordFieldsDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Plano relacionado ao histórico. O vínculo não conclui nem atualiza o plano.',
  })
  @IsOptional()
  @IsUUID()
  planId?: string;
}
