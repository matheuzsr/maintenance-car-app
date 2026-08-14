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
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreateExpenseDto,
  ExpenseResponseDto,
  ListExpensesQueryDto,
  PaginatedExpensesResponseDto,
  UpdateExpenseDto,
} from './dto';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'vehicles/:vehicleId/expenses', version: '1' })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @ApiOperation({ summary: 'Creates a vehicle expense' })
  @ApiCreatedResponse({ type: ExpenseResponseDto })
  @ApiNotFoundResponse({
    description: 'Vehicle or maintenance record not found',
  })
  create(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(userId, vehicleId, dto);
  }

  @Get()
  @ApiOperation({ summary: "Lists a vehicle's expenses" })
  @ApiOkResponse({ type: PaginatedExpensesResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle not found' })
  findAll(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Query() query: ListExpensesQueryDto,
  ) {
    return this.expensesService.findAll(userId, vehicleId, query);
  }

  @Get(':expenseId')
  @ApiOperation({ summary: 'Retrieves a vehicle expense' })
  @ApiOkResponse({ type: ExpenseResponseDto })
  @ApiNotFoundResponse({ description: 'Vehicle or expense not found' })
  findOne(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expensesService.findOne(userId, vehicleId, expenseId);
  }

  @Patch(':expenseId')
  @ApiOperation({ summary: 'Updates a vehicle expense' })
  @ApiOkResponse({ type: ExpenseResponseDto })
  @ApiNotFoundResponse({
    description: 'Vehicle, expense, or maintenance record not found',
  })
  update(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(userId, vehicleId, expenseId, dto);
  }

  @Delete(':expenseId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-deletes a vehicle expense' })
  @ApiNoContentResponse({ description: 'Expense deleted' })
  @ApiNotFoundResponse({ description: 'Vehicle or expense not found' })
  remove(
    @CurrentUserId() userId: string,
    @Param('vehicleId', ParseUUIDPipe) vehicleId: string,
    @Param('expenseId', ParseUUIDPipe) expenseId: string,
  ) {
    return this.expensesService.remove(userId, vehicleId, expenseId);
  }
}
