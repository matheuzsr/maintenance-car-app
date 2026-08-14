import type {
  CreateOdometerReadingInput,
  CreateVehicleInput,
  OdometerReading,
  Paginated,
  UpdateVehicleInput,
  Vehicle,
} from '~/types/api';
import { apiRequest } from './request';

export const vehicleKeys = {
  all: ['vehicles'] as const,
  detail: (id: string) => ['vehicles', id] as const,
  odometer: (id: string) => ['vehicles', id, 'odometer'] as const,
};

export const listVehicles = () =>
  apiRequest<Paginated<Vehicle>>('/api/v1/vehicles?limit=100');
export const getVehicle = (id: string) =>
  apiRequest<Vehicle>(`/api/v1/vehicles/${id}`);
export const createVehicle = (body: CreateVehicleInput) =>
  apiRequest<Vehicle>('/api/v1/vehicles', { method: 'POST', body });
export const updateVehicle = (id: string, body: UpdateVehicleInput) =>
  apiRequest<Vehicle>(`/api/v1/vehicles/${id}`, { method: 'PATCH', body });
export const deleteVehicle = (id: string) =>
  apiRequest<unknown>(`/api/v1/vehicles/${id}`, { method: 'DELETE' });
export const listOdometerReadings = (id: string) =>
  apiRequest<Paginated<OdometerReading>>(
    `/api/v1/vehicles/${id}/odometer-readings?limit=100`,
  );
export const createOdometerReading = (
  id: string,
  body: CreateOdometerReadingInput,
) =>
  apiRequest<OdometerReading>(`/api/v1/vehicles/${id}/odometer-readings`, {
    method: 'POST',
    body,
  });
