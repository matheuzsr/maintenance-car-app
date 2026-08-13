import { DateTime } from 'luxon';

export enum DueStatus {
  NOT_CONFIGURED = 'NOT_CONFIGURED',
  UNKNOWN = 'UNKNOWN',
  ON_TRACK = 'ON_TRACK',
  DUE_SOON = 'DUE_SOON',
  OVERDUE = 'OVERDUE',
}

export interface MaintenanceStatusInput {
  intervalMonths: number | null;
  intervalKm: number | null;
  alertBeforeDays: number;
  alertBeforeKm: number;
  lastPerformedAt: Date | null;
  lastPerformedOdometerKm: number | null;
  currentOdometerKm: number;
  now: Date;
  timezone: string;
}

interface TimeStatus {
  status: DueStatus;
  dueDate?: string;
  remainingDays?: number;
  overdueByDays?: number;
}

interface OdometerStatus {
  status: DueStatus;
  dueAtKm?: number;
  remainingKm?: number;
  overdueByKm?: number;
}

export interface MaintenanceStatusResult {
  overallStatus: DueStatus;
  timeStatus: TimeStatus;
  odometerStatus: OdometerStatus;
  reasons: string[];
}

const statusPriority: Record<DueStatus, number> = {
  [DueStatus.NOT_CONFIGURED]: 0,
  [DueStatus.ON_TRACK]: 1,
  [DueStatus.UNKNOWN]: 2,
  [DueStatus.DUE_SOON]: 3,
  [DueStatus.OVERDUE]: 4,
};

export function calculateMaintenanceStatus(
  input: MaintenanceStatusInput,
): MaintenanceStatusResult {
  const reasons: string[] = [];
  const timeStatus = calculateTimeStatus(input, reasons);
  const odometerStatus = calculateOdometerStatus(input, reasons);
  const overallStatus =
    statusPriority[timeStatus.status] >= statusPriority[odometerStatus.status]
      ? timeStatus.status
      : odometerStatus.status;

  return { overallStatus, timeStatus, odometerStatus, reasons };
}

function calculateTimeStatus(
  input: MaintenanceStatusInput,
  reasons: string[],
): TimeStatus {
  if (input.intervalMonths === null) {
    return { status: DueStatus.NOT_CONFIGURED };
  }
  if (input.lastPerformedAt === null) {
    reasons.push('Informe a data da última execução');
    return { status: DueStatus.UNKNOWN };
  }

  const lastPerformed = DateTime.fromJSDate(input.lastPerformedAt, {
    zone: input.timezone,
  }).startOf('day');
  const due = lastPerformed.plus({ months: input.intervalMonths });
  const today = DateTime.fromJSDate(input.now, {
    zone: input.timezone,
  }).startOf('day');
  const remainingDays = Math.round(due.diff(today, 'days').days);
  const dueDate = due.toISODate() ?? undefined;

  if (remainingDays < 0) {
    const overdueByDays = Math.abs(remainingDays);
    reasons.push(`Vencida há ${overdueByDays} dia(s)`);
    return { status: DueStatus.OVERDUE, dueDate, overdueByDays };
  }
  if (remainingDays <= input.alertBeforeDays) {
    reasons.push(
      remainingDays === 0
        ? 'Vence hoje pelo prazo'
        : `Faltam ${remainingDays} dia(s) para o prazo`,
    );
    return { status: DueStatus.DUE_SOON, dueDate, remainingDays };
  }
  return { status: DueStatus.ON_TRACK, dueDate, remainingDays };
}

function calculateOdometerStatus(
  input: MaintenanceStatusInput,
  reasons: string[],
): OdometerStatus {
  if (input.intervalKm === null) {
    return { status: DueStatus.NOT_CONFIGURED };
  }
  if (input.lastPerformedOdometerKm === null) {
    reasons.push('Informe a quilometragem da última execução');
    return { status: DueStatus.UNKNOWN };
  }

  const dueAtKm = input.lastPerformedOdometerKm + input.intervalKm;
  const remainingKm = dueAtKm - input.currentOdometerKm;
  if (remainingKm <= 0) {
    const overdueByKm = Math.abs(remainingKm);
    reasons.push(
      overdueByKm === 0
        ? 'Atingiu a quilometragem limite'
        : `Ultrapassou o limite em ${overdueByKm} km`,
    );
    return { status: DueStatus.OVERDUE, dueAtKm, overdueByKm };
  }
  if (remainingKm <= input.alertBeforeKm) {
    reasons.push(`Faltam ${remainingKm} km para o limite`);
    return { status: DueStatus.DUE_SOON, dueAtKm, remainingKm };
  }
  return { status: DueStatus.ON_TRACK, dueAtKm, remainingKm };
}
