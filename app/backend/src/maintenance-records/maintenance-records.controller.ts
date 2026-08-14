import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CompleteMaintenancePlanDto,
  CreateMaintenanceRecordDto,
  ListMaintenanceRecordsQueryDto,
  MaintenanceRecordListResponseDto,
  MaintenanceRecordPaginationMetaDto,
  MaintenanceRecordResponseDto,
  UpdateMaintenanceRecordDto,
} from './dto';
import { MaintenanceRecordsService } from './maintenance-records.service';

@ApiTags('maintenance-records')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  MaintenanceRecordResponseDto,
  MaintenanceRecordPaginationMetaDto,
)
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vehicles/:vehicleId', version: '1' })
export class MaintenanceRecordsController {
  constructor(
    private readonly maintenanceRecordsService: MaintenanceRecordsService,
  ) {}

  @Post('maintenance-records')
  @ApiOperation({ summary: 'Records completed maintenance' })
  @ApiCreatedResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle or maintenance plan not found' })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceRecordsService.create(userId, vehicleId, dto);
  }

  @Post('maintenance-plans/:planId/complete')
  @ApiOperation({ summary: 'Completes a plan and records its service' })
  @ApiCreatedResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle or maintenance plan not found' })
  completePlan(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('planId', ParseUUIDPipe) planId: string,
    @Body() dto: CompleteMaintenancePlanDto,
  ) {
    return this.maintenanceRecordsService.completePlan(
      userId,
      vehicleId,
      planId,
      dto,
    );
  }

  @Get('maintenance-records')
  @ApiOperation({ summary: "Lists a vehicle's maintenance history" })
  @ApiOkResponse({
    type: MaintenanceRecordListResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() query: ListMaintenanceRecordsQueryDto,
  ) {
    return this.maintenanceRecordsService.findAll(userId, vehicleId, query);
  }

  @Get('maintenance-records/:recordId')
  @ApiOperation({ summary: 'Retrieves a maintenance record' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({
    description: 'Vehicle or maintenance record not found',
  })
  findOne(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.maintenanceRecordsService.findOne(userId, vehicleId, recordId);
  }

  @Patch('maintenance-records/:recordId')
  @ApiOperation({ summary: 'Updates a maintenance record' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({
    description: 'Vehicle, maintenance plan, or maintenance record not found',
  })
  update(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateMaintenanceRecordDto,
  ) {
    return this.maintenanceRecordsService.update(
      userId,
      vehicleId,
      recordId,
      dto,
    );
  }

  @Delete('maintenance-records/:recordId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-deletes a maintenance record' })
  @ApiNoContentResponse({ description: 'Maintenance record deleted' })
  @ApiNotFoundResponse({
    description: 'Vehicle or maintenance record not found',
  })
  @ApiConflictResponse({
    description: 'Active expenses are linked to the maintenance record',
  })
  remove(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.maintenanceRecordsService.remove(userId, vehicleId, recordId);
  }
}
