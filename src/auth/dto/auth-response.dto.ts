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

  @ApiProperty({ description: 'Use no botão Authorize do Swagger.' })
  accessToken!: string;

  @ApiProperty({ description: 'Use somente em refresh e logout.' })
  refreshToken!: string;
}

export class TokenPairResponseDto {
  @ApiProperty({ description: 'Novo access token.' })
  accessToken!: string;

  @ApiProperty({ description: 'Novo refresh token; o anterior foi revogado.' })
  refreshToken!: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: true;
}
