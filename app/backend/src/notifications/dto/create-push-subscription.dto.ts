import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreatePushSubscriptionDto {
  @ApiProperty({
    example: 'https://updates.push.services.mozilla.com/wpush/v2/example',
    description: 'Endpoint returned by the browser Push API.',
  })
  @IsUrl({ require_protocol: true, protocols: ['https'] })
  @MaxLength(2048)
  endpoint!: string;

  @ApiProperty({ description: 'Browser subscription P-256 public key.' })
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  p256dh!: string;

  @ApiProperty({ description: 'Browser subscription authentication secret.' })
  @IsString()
  @MinLength(1)
  @MaxLength(256)
  auth!: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}
