import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ExpenseFieldsDto } from './expense-fields.dto';

export class CreateExpenseDto extends ExpenseFieldsDto {
  @ApiPropertyOptional({
    format: 'uuid',
    nullable: true,
    description:
      'Maintenance record associated with this expense. It must belong to the same user and vehicle.',
  })
  @IsOptional()
  @IsUUID()
  maintenanceRecordId?: string | null;
}
