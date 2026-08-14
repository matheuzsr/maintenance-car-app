import type { components } from '@maintenance-car/api-contract';

export interface ApiError {
  message: string;
  status?: number;
  correlationId?: string;
}

export type ApiSchemas = components['schemas'];
export type AuthenticatedUser = ApiSchemas['AuthenticatedUserDto'];
export type LoginInput = ApiSchemas['LoginDto'];
export type RegisterInput = ApiSchemas['RegisterDto'];
export type Vehicle = ApiSchemas['VehicleResponseDto'];
export type CreateVehicleInput = ApiSchemas['CreateVehicleDto'];
export type UpdateVehicleInput = ApiSchemas['UpdateVehicleDto'];
export type OdometerReading = ApiSchemas['OdometerReadingResponseDto'];
export type CreateOdometerReadingInput = ApiSchemas['CreateOdometerReadingDto'];
export type MaintenanceTemplate = ApiSchemas['MaintenanceTemplateResponseDto'];
export type MaintenancePlan = ApiSchemas['MaintenancePlanResponseDto'];
export type MaintenanceCategory = MaintenancePlan['category'];
type GeneratedCreateMaintenancePlanInput =
  ApiSchemas['CreateMaintenancePlanDto'];
export type CreateMaintenancePlanInput = Omit<
  GeneratedCreateMaintenancePlanInput,
  'description' | 'intervalMonths' | 'intervalKm'
> & {
  description?: string | null;
  intervalMonths?: number | null;
  intervalKm?: number | null;
};
export type UpdateMaintenancePlanInput = Partial<
  Omit<CreateMaintenancePlanInput, 'templateId'>
>;
export type MaintenanceDueStatus =
  'NOT_CONFIGURED' | 'UNKNOWN' | 'ON_TRACK' | 'DUE_SOON' | 'OVERDUE';
export type MaintenanceAgendaTimeStatus =
  ApiSchemas['MaintenanceAgendaTimeStatusResponseDto'];
export type MaintenanceAgendaOdometerStatus =
  ApiSchemas['MaintenanceAgendaOdometerStatusResponseDto'];
export type MaintenanceAgendaDimension =
  MaintenanceAgendaTimeStatus | MaintenanceAgendaOdometerStatus;
export type MaintenanceAgendaEntry =
  ApiSchemas['MaintenanceAgendaEntryResponseDto'];
export type MaintenanceRecord = ApiSchemas['MaintenanceRecordResponseDto'];
export type CreateMaintenanceRecordInput =
  ApiSchemas['CreateMaintenanceRecordDto'];
export type CompleteMaintenancePlanInput =
  ApiSchemas['CompleteMaintenancePlanDto'];
export type UpdateMaintenanceRecordInput =
  ApiSchemas['UpdateMaintenanceRecordDto'];
export type PaginationMeta = ApiSchemas['PaginationMetaDto'];
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
