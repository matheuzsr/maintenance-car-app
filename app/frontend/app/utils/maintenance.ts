import type {
  MaintenanceAgendaDimension,
  MaintenanceAgendaEntry,
  MaintenanceDueStatus,
} from '~/types/api';

const priority: Record<MaintenanceDueStatus, number> = {
  OVERDUE: 0,
  DUE_SOON: 1,
  UNKNOWN: 2,
  ON_TRACK: 3,
  NOT_CONFIGURED: 4,
};

export const sortAgendaByUrgency = (entries: MaintenanceAgendaEntry[]) =>
  [...entries].sort(
    (left, right) =>
      priority[left.status.overallStatus] -
        priority[right.status.overallStatus] ||
      left.plan.name.localeCompare(right.plan.name),
  );

export const statusTone = (
  status: MaintenanceDueStatus,
): 'neutral' | 'success' | 'warning' | 'danger' | 'info' =>
  ({
    NOT_CONFIGURED: 'neutral',
    UNKNOWN: 'info',
    ON_TRACK: 'success',
    DUE_SOON: 'warning',
    OVERDUE: 'danger',
  })[status] as 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export const dimensionMessageKey = (
  dimension: MaintenanceAgendaDimension,
  kind: 'time' | 'odometer',
) => {
  const suffix =
    dimension.status === 'OVERDUE' &&
    'overdueByKm' in dimension &&
    dimension.overdueByKm === 0
      ? 'reached'
      : dimension.status === 'OVERDUE'
        ? 'overdue'
        : dimension.status === 'DUE_SOON'
          ? 'soon'
          : dimension.status === 'ON_TRACK'
            ? 'onTrack'
            : dimension.status === 'UNKNOWN'
              ? 'unknown'
              : 'notConfigured';
  return `maintenance.status.dimension.${kind}.${suffix}`;
};
