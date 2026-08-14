import { ApiProperty } from '@nestjs/swagger';

export class AuthenticatedUserDto {
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
}

export class AccessTokenResponseDto {
  @ApiProperty({ description: 'New access token.' })
  accessToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: true;
}
