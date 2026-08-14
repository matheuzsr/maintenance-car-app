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
export type PaginationMeta = ApiSchemas['PaginationMetaDto'];
export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
}
