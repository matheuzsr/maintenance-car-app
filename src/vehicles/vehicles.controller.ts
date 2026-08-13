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
  CreateOdometerReadingDto,
  CreateVehicleDto,
  ListQueryDto,
  UpdateVehicleDto,
} from './dto';
import {
  OdometerReadingResponseDto,
  PaginationMetaDto,
  VehicleResponseDto,
} from './dto/vehicle-response.dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth('access-token')
@ApiExtraModels(
  VehicleResponseDto,
  OdometerReadingResponseDto,
  PaginationMetaDto,
)
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vehicles', version: '1' })
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um veículo' })
  @ApiCreatedResponse({ type: VehicleResponseDto })
  create(@CurrentUserId() userId: string, @Body() dto: CreateVehicleDto) {
    return this.vehiclesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista os veículos ativos do usuário' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(VehicleResponseDto) },
        },
        meta: { $ref: getSchemaPath(PaginationMetaDto) },
      },
    },
  })
  findAll(@CurrentUserId() userId: string, @Query() query: ListQueryDto) {
    return this.vehiclesService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Consulta um veículo' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  findOne(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualiza os dados de um veículo' })
  @ApiOkResponse({ type: VehicleResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  update(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui logicamente um veículo' })
  @ApiNoContentResponse({ description: 'Veículo excluído' })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  remove(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.vehiclesService.remove(userId, id);
  }

  @Post(':id/odometer-readings')
  @ApiOperation({ summary: 'Registra uma leitura do hodômetro' })
  @ApiCreatedResponse({ type: OdometerReadingResponseDto })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  createOdometerReading(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOdometerReadingDto,
  ) {
    return this.vehiclesService.createOdometerReading(userId, id, dto);
  }

  @Get(':id/odometer-readings')
  @ApiOperation({ summary: 'Lista as leituras do hodômetro' })
  @ApiOkResponse({
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: getSchemaPath(OdometerReadingResponseDto) },
        },
        meta: { $ref: getSchemaPath(PaginationMetaDto) },
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Veículo não encontrado' })
  findOdometerReadings(
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListQueryDto,
  ) {
    return this.vehiclesService.findOdometerReadings(userId, id, query);
  }
}
