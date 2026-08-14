import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MaintenancePlanResponseDto } from '../maintenance-plans/dto';
import { DueStatus } from './maintenance-status';

export class MaintenanceAgendaTimeStatusResponseDto {
  @ApiProperty({ enum: DueStatus })
  status!: DueStatus;

  @ApiPropertyOptional({ format: 'date', example: '2026-08-31' })
  dueDate?: string;

  @ApiPropertyOptional({ example: 17 })
  remainingDays?: number;

  @ApiPropertyOptional({ example: 4 })
  overdueByDays?: number;
}

export class MaintenanceAgendaOdometerStatusResponseDto {
  @ApiProperty({ enum: DueStatus })
  status!: DueStatus;

  @ApiPropertyOptional({ example: 60000 })
  dueAtKm?: number;

  @ApiPropertyOptional({ example: 500 })
  remainingKm?: number;

  @ApiPropertyOptional({ example: 250 })
  overdueByKm?: number;
}

export class MaintenanceAgendaStatusResponseDto {
  @ApiProperty({ enum: DueStatus })
  overallStatus!: DueStatus;

  @ApiProperty({ type: MaintenanceAgendaTimeStatusResponseDto })
  timeStatus!: MaintenanceAgendaTimeStatusResponseDto;

  @ApiProperty({ type: MaintenanceAgendaOdometerStatusResponseDto })
  odometerStatus!: MaintenanceAgendaOdometerStatusResponseDto;

  @ApiProperty({
    type: [String],
    description:
      'Calendar and odometer reasons, in that order when both dimensions provide a reason.',
    example: ['Overdue by 4 day(s)', '500 km remaining until the limit'],
  })
  reasons!: string[];
}

export class MaintenanceAgendaEntryResponseDto {
  @ApiProperty({ type: MaintenancePlanResponseDto })
  plan!: MaintenancePlanResponseDto;

  @ApiProperty({ type: MaintenanceAgendaStatusResponseDto })
  status!: MaintenanceAgendaStatusResponseDto;
}
