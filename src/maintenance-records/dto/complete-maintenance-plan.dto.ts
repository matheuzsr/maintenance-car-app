import { IntersectionType, PartialType, PickType } from '@nestjs/swagger';
import { MaintenanceRecordFieldsDto } from './maintenance-record-fields.dto';

export class CompleteMaintenancePlanDto extends IntersectionType(
  PickType(MaintenanceRecordFieldsDto, [
    'performedAt',
    'odometerKm',
    'workshop',
    'notes',
    'totalCost',
  ] as const),
  PartialType(PickType(MaintenanceRecordFieldsDto, ['description'] as const)),
) {}
