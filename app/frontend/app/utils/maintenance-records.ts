import { maintenanceKeys } from '~/services/api/maintenance';
import { vehicleKeys } from '~/services/api/vehicles';

export function maintenanceRecordInvalidationKeys(vehicleId: string) {
  return [
    maintenanceKeys.recordsBase(vehicleId),
    maintenanceKeys.agendaBase(vehicleId),
    ['maintenance', 'vehicles', vehicleId, 'plans'] as const,
    vehicleKeys.odometer(vehicleId),
    vehicleKeys.detail(vehicleId),
    vehicleKeys.all,
    ['expenses', 'vehicles', vehicleId] as const,
    ['reports', 'vehicles', vehicleId] as const,
  ];
}

export function maintenanceRecordQuery(
  page: number,
  limit: number,
  planId?: string,
) {
  return {
    page,
    limit,
    ...(planId ? { planId } : {}),
  };
}

export function maintenanceRecordDeleteErrorKey(error: unknown): string {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 409
    ? 'maintenance.records.detail.deleteConflict'
    : 'maintenance.records.detail.deleteError';
}
