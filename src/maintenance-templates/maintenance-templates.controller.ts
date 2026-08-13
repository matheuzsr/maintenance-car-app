import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ListMaintenanceTemplatesQueryDto,
  MaintenanceTemplateResponseDto,
} from './dto';
import { MaintenanceTemplatesService } from './maintenance-templates.service';

@ApiTags('maintenance-templates')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'maintenance-templates', version: '1' })
export class MaintenanceTemplatesController {
  constructor(
    private readonly maintenanceTemplatesService: MaintenanceTemplatesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Lista os modelos ativos de manutenção' })
  @ApiOkResponse({ type: MaintenanceTemplateResponseDto, isArray: true })
  findAll(@Query() query: ListMaintenanceTemplatesQueryDto) {
    return this.maintenanceTemplatesService.findAll(query);
  }
}
