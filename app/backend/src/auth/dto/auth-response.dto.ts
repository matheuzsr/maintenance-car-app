import { ApiProperty } from '@nestjs/swagger';

class AuthenticatedUserDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Matheus Rocha' })
  name!: string;

  @ApiProperty({ example: 'matheus@example.com' })
  email!: string;

  @ApiProperty({ example: 'America/Sao_Paulo' })
  timezone!: string;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthenticatedUserDto })
  user!: AuthenticatedUserDto;

  @ApiProperty({
    description: 'Use this value in the Swagger Authorize dialog.',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Use only for refresh and logout.' })
  refreshToken!: string;
}

export class TokenPairResponseDto {
  @ApiProperty({ description: 'New access token.' })
  accessToken!: string;

  @ApiProperty({
    description: 'New refresh token; the previous one was revoked.',
  })
  refreshToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: true;
}
