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
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CompleteMaintenancePlanDto,
  CreateMaintenanceRecordDto,
  ListMaintenanceRecordsQueryDto,
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
  @ApiOperation({ summary: 'Registra uma manutenção executada' })
  @ApiCreatedResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo ou plano não encontrado' })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateMaintenanceRecordDto,
  ) {
    return this.maintenanceRecordsService.create(userId, vehicleId, dto);
  }

  @Post('maintenance-plans/:planId/complete')
  @ApiOperation({ summary: 'Conclui um plano e registra sua execução' })
  @ApiCreatedResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo ou plano não encontrado' })
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
  @ApiOperation({ summary: 'Lista o histórico de manutenção do veículo' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MaintenanceRecordResponseDto) },
        },
        meta: { $ref: getSchemaPath(MaintenanceRecordPaginationMetaDto) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() query: ListMaintenanceRecordsQueryDto,
  ) {
    return this.maintenanceRecordsService.findAll(userId, vehicleId, query);
  }

  @Get('maintenance-records/:recordId')
  @ApiOperation({ summary: 'Consulta um registro de manutenção' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo ou registro não encontrado' })
  findOne(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.maintenanceRecordsService.findOne(userId, vehicleId, recordId);
  }

  @Patch('maintenance-records/:recordId')
  @ApiOperation({ summary: 'Atualiza um registro de manutenção' })
  @ApiOkResponse({ type: MaintenanceRecordResponseDto })
  @ApiNotFoundResponse({
    description: 'Veículo, plano ou registro não encontrado',
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
  @ApiOperation({ summary: 'Exclui logicamente um registro de manutenção' })
  @ApiNoContentResponse({ description: 'Registro excluído' })
  @ApiNotFoundResponse({ description: 'Veículo ou registro não encontrado' })
  remove(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.maintenanceRecordsService.remove(userId, vehicleId, recordId);
  }
}
