import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AgendaQueryDto } from './agenda-query.dto';
import { RemindersService } from './reminders.service';

@ApiTags('maintenance-agenda')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vehicles/:vehicleId/maintenance-agenda', version: '1' })
export class RemindersController {
  constructor(private readonly reminders: RemindersService) {}

  @Get()
  @ApiOperation({
    summary: 'Retrieves the schedule and reasons for each status',
  })
  @ApiOkResponse({
    description: 'Plans with separate time and mileage statuses',
  })
  getAgenda(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() query: AgendaQueryDto,
  ) {
    return this.reminders.getAgenda(userId, vehicleId, query);
  }
}
