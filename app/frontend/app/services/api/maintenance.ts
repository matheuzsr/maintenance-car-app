import type {
  CreateMaintenancePlanInput,
  CreateMaintenanceRecordInput,
  CompleteMaintenancePlanInput,
  MaintenanceAgendaEntry,
  MaintenanceCategory,
  MaintenancePlan,
  MaintenanceRecord,
  MaintenanceTemplate,
  MaintenanceDueStatus,
  Paginated,
  UpdateMaintenancePlanInput,
  UpdateMaintenanceRecordInput,
} from '~/types/api';
import { apiRequest } from './request';

export const maintenanceKeys = {
  all: ['maintenance'] as const,
  templates: (category?: MaintenanceCategory) =>
    ['maintenance', 'templates', category ?? 'all'] as const,
  plans: (vehicleId: string, filters?: MaintenancePlanFilters) =>
    ['maintenance', 'vehicles', vehicleId, 'plans', filters ?? {}] as const,
  plan: (vehicleId: string, planId: string) =>
    ['maintenance', 'vehicles', vehicleId, 'plans', planId] as const,
  agendaBase: (vehicleId: string) =>
    ['maintenance', 'vehicles', vehicleId, 'agenda'] as const,
  agenda: (vehicleId: string, status?: MaintenanceDueStatus) =>
    ['maintenance', 'vehicles', vehicleId, 'agenda', status ?? 'all'] as const,
  recordsBase: (vehicleId: string) =>
    ['maintenance', 'vehicles', vehicleId, 'records'] as const,
  records: (vehicleId: string, filters?: MaintenanceRecordFilters) =>
    ['maintenance', 'vehicles', vehicleId, 'records', filters ?? {}] as const,
  record: (vehicleId: string, recordId: string) =>
    ['maintenance', 'vehicles', vehicleId, 'records', recordId] as const,
};

export interface MaintenancePlanFilters {
  page: number;
  limit: number;
  category?: MaintenanceCategory;
  active?: boolean;
}

export interface MaintenanceRecordFilters {
  page: number;
  limit: number;
  planId?: string;
}

export const maintenancePlanQuery = (filters: MaintenancePlanFilters) => {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.category) query.set('category', filters.category);
  if (filters.active !== undefined) query.set('active', String(filters.active));
  return query.toString();
};

export const listMaintenanceTemplates = (category?: MaintenanceCategory) =>
  apiRequest<MaintenanceTemplate[]>(
    `/api/v1/maintenance-templates${category ? `?category=${category}` : ''}`,
  );

export const listMaintenancePlans = (
  vehicleId: string,
  filters: MaintenancePlanFilters,
) =>
  apiRequest<Paginated<MaintenancePlan>>(
    `/api/v1/vehicles/${vehicleId}/maintenance-plans?${maintenancePlanQuery(filters)}`,
  );

export const getMaintenancePlan = (vehicleId: string, planId: string) =>
  apiRequest<MaintenancePlan>(
    `/api/v1/vehicles/${vehicleId}/maintenance-plans/${planId}`,
  );

export const createMaintenancePlan = (
  vehicleId: string,
  body: CreateMaintenancePlanInput,
) =>
  apiRequest<MaintenancePlan>(
    `/api/v1/vehicles/${vehicleId}/maintenance-plans`,
    { method: 'POST', body },
  );

export const updateMaintenancePlan = (
  vehicleId: string,
  planId: string,
  body: UpdateMaintenancePlanInput,
) =>
  apiRequest<MaintenancePlan>(
    `/api/v1/vehicles/${vehicleId}/maintenance-plans/${planId}`,
    { method: 'PATCH', body },
  );

export const deleteMaintenancePlan = (vehicleId: string, planId: string) =>
  apiRequest<unknown>(
    `/api/v1/vehicles/${vehicleId}/maintenance-plans/${planId}`,
    { method: 'DELETE' },
  );

export const getMaintenanceAgenda = (
  vehicleId: string,
  status?: MaintenanceDueStatus,
) =>
  apiRequest<MaintenanceAgendaEntry[]>(
    `/api/v1/vehicles/${vehicleId}/maintenance-agenda${status ? `?status=${status}` : ''}`,
  );

export const maintenanceRecordQuery = (filters: MaintenanceRecordFilters) => {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.planId) query.set('planId', filters.planId);
  return query.toString();
};

export const listMaintenanceRecords = (
  vehicleId: string,
  filters: MaintenanceRecordFilters,
) =>
  apiRequest<Paginated<MaintenanceRecord>>(
    `/api/v1/vehicles/${vehicleId}/maintenance-records?${maintenanceRecordQuery(filters)}`,
  );

export const getMaintenanceRecord = (vehicleId: string, recordId: string) =>
  apiRequest<MaintenanceRecord>(
    `/api/v1/vehicles/${vehicleId}/maintenance-records/${recordId}`,
  );

export const createMaintenanceRecord = (
  vehicleId: string,
  body: CreateMaintenanceRecordInput,
) =>
  apiRequest<MaintenanceRecord>(
    `/api/v1/vehicles/${vehicleId}/maintenance-records`,
    { method: 'POST', body },
  );

export const completeMaintenancePlan = (
  vehicleId: string,
  planId: string,
  body: CompleteMaintenancePlanInput,
) =>
  apiRequest<MaintenanceRecord>(
    `/api/v1/vehicles/${vehicleId}/maintenance-plans/${planId}/complete`,
    { method: 'POST', body },
  );

export const updateMaintenanceRecord = (
  vehicleId: string,
  recordId: string,
  body: UpdateMaintenanceRecordInput,
) =>
  apiRequest<MaintenanceRecord>(
    `/api/v1/vehicles/${vehicleId}/maintenance-records/${recordId}`,
    { method: 'PATCH', body },
  );

export const deleteMaintenanceRecord = (vehicleId: string, recordId: string) =>
  apiRequest<unknown>(
    `/api/v1/vehicles/${vehicleId}/maintenance-records/${recordId}`,
    { method: 'DELETE' },
  );
