import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CostReportQueryDto, CostReportResponseDto } from './dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('costs')
  @ApiOperation({
    summary: 'Reports vehicle costs by calendar month or year',
    description:
      'Separates maintenance record costs, standalone expenses, and linked itemized expenses. Linked itemized expenses are excluded from the total to prevent double counting.',
  })
  @ApiOkResponse({ type: CostReportResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid query or the start instant is after the end instant',
  })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  getCosts(
    @CurrentUserId() userId: string,
    @Query() query: CostReportQueryDto,
  ): Promise<CostReportResponseDto> {
    return this.reportsService.getCosts(userId, query);
  }
}
