import type {
  CostReport,
  CostReportPeriod,
  CreateExpenseInput,
  Expense,
  ExpenseCategory,
  Paginated,
  UpdateExpenseInput,
} from '~/types/api';
import { apiRequest } from './request';

export interface ExpenseFilters {
  page: number;
  limit: number;
  category?: ExpenseCategory;
  incurredFrom?: string;
  incurredTo?: string;
}

export interface CostReportFilters {
  vehicleId: string;
  period: CostReportPeriod;
  from?: string;
  to?: string;
}

export const expenseKeys = {
  all: ['expenses'] as const,
  vehicle: (vehicleId: string) => ['expenses', 'vehicles', vehicleId] as const,
  list: (vehicleId: string, filters: ExpenseFilters) =>
    ['expenses', 'vehicles', vehicleId, 'list', filters] as const,
  detail: (vehicleId: string, expenseId: string) =>
    ['expenses', 'vehicles', vehicleId, 'detail', expenseId] as const,
};

export const reportKeys = {
  all: ['reports'] as const,
  vehicle: (vehicleId: string) => ['reports', 'vehicles', vehicleId] as const,
  costs: (filters: CostReportFilters) =>
    ['reports', 'vehicles', filters.vehicleId, 'costs', filters] as const,
};

export function expenseQuery(filters: ExpenseFilters): string {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  if (filters.category) query.set('category', filters.category);
  if (filters.incurredFrom) query.set('incurredFrom', filters.incurredFrom);
  if (filters.incurredTo) query.set('incurredTo', filters.incurredTo);
  return query.toString();
}

export function costReportQuery(filters: CostReportFilters): string {
  const query = new URLSearchParams({
    vehicleId: filters.vehicleId,
    period: filters.period,
  });
  if (filters.from) query.set('from', filters.from);
  if (filters.to) query.set('to', filters.to);
  return query.toString();
}

export function pageAfterDeletingItem(
  page: number,
  currentPageCount: number,
): number {
  return page > 1 && currentPageCount <= 1 ? page - 1 : page;
}

export const listExpenses = (vehicleId: string, filters: ExpenseFilters) =>
  apiRequest<Paginated<Expense>>(
    `/api/v1/vehicles/${vehicleId}/expenses?${expenseQuery(filters)}`,
  );

export const getExpense = (vehicleId: string, expenseId: string) =>
  apiRequest<Expense>(`/api/v1/vehicles/${vehicleId}/expenses/${expenseId}`);

export const createExpense = (vehicleId: string, body: CreateExpenseInput) =>
  apiRequest<Expense>(`/api/v1/vehicles/${vehicleId}/expenses`, {
    method: 'POST',
    body,
  });

export const updateExpense = (
  vehicleId: string,
  expenseId: string,
  body: UpdateExpenseInput,
) =>
  apiRequest<Expense>(`/api/v1/vehicles/${vehicleId}/expenses/${expenseId}`, {
    method: 'PATCH',
    body,
  });

export const deleteExpense = (vehicleId: string, expenseId: string) =>
  apiRequest<unknown>(`/api/v1/vehicles/${vehicleId}/expenses/${expenseId}`, {
    method: 'DELETE',
  });

export const getCostReport = (filters: CostReportFilters) =>
  apiRequest<CostReport>(`/api/v1/reports/costs?${costReportQuery(filters)}`);
