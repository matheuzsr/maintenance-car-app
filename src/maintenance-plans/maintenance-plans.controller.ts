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
  CreateMaintenancePlanDto,
  ListMaintenancePlansQueryDto,
  MaintenancePlanPaginationMetaDto,
  MaintenancePlanResponseDto,
  UpdateMaintenancePlanDto,
} from './dto';
import { MaintenancePlansService } from './maintenance-plans.service';

@ApiTags('maintenance-plans')
@ApiBearerAuth('access-token')
@ApiExtraModels(MaintenancePlanResponseDto, MaintenancePlanPaginationMetaDto)
@UseGuards(JwtAuthGuard)
@Controller({
  path: 'vehicles/:vehicleId/maintenance-plans',
  version: '1',
})
export class MaintenancePlansController {
  constructor(
    private readonly maintenancePlansService: MaintenancePlansService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cria um plano de manutenção para o veículo' })
  @ApiCreatedResponse({ type: MaintenancePlanResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo ou template não encontrado' })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateMaintenancePlanDto,
  ) {
    return this.maintenancePlansService.create(userId, vehicleId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os planos de manutenção do veículo' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MaintenancePlanResponseDto) },
        },
        meta: { $ref: getSchemaPath(MaintenancePlanPaginationMetaDto) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() query: ListMaintenancePlansQueryDto,
  ) {
    return this.maintenancePlansService.findAll(userId, vehicleId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um plano de manutenção' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo ou plano não encontrado' })
  findOne(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenancePlansService.findOne(userId, vehicleId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza um plano de manutenção' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo ou plano não encontrado' })
  update(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMaintenancePlanDto,
  ) {
    return this.maintenancePlansService.update(userId, vehicleId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui logicamente um plano de manutenção' })
  @ApiNoContentResponse({ description: 'Plano excluído' })
  @ApiNotFoundResponse({ description: 'Veículo ou plano não encontrado' })
  remove(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenancePlansService.remove(userId, vehicleId, id);
  }
}
