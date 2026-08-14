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
  @ApiOperation({ summary: 'Creates a maintenance plan for a vehicle' })
  @ApiCreatedResponse({ type: MaintenancePlanResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle or template not found' })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateMaintenancePlanDto,
  ) {
    return this.maintenancePlansService.create(userId, vehicleId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lists a vehicle's maintenance plans" })
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['data', 'meta'],
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(MaintenancePlanResponseDto) },
        },
        meta: { $ref: getSchemaPath(MaintenancePlanPaginationMetaDto) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() query: ListMaintenancePlansQueryDto,
  ) {
    return this.maintenancePlansService.findAll(userId, vehicleId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieves a maintenance plan' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle or maintenance plan not found' })
  findOne(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenancePlansService.findOne(userId, vehicleId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updates a maintenance plan' })
  @ApiOkResponse({ type: MaintenancePlanResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle or maintenance plan not found' })
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
  @ApiOperation({ summary: 'Soft-deletes a maintenance plan' })
  @ApiNoContentResponse({ description: 'Maintenance plan deleted' })
  @ApiNotFoundResponse({ description: 'Vehicle or maintenance plan not found' })
  remove(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.maintenancePlansService.remove(userId, vehicleId, id);
  }
}
