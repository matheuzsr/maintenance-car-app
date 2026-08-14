import { Controller, Get, NotFoundException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUserDto } from '../auth/dto/auth-response.dto';
import { CurrentUserId } from '../auth/decorators/current-user-id.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @ApiOkResponse({ type: AuthenticatedUserDto })
  async me(@CurrentUserId() userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.users.findPublicProfile(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
