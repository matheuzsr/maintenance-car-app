import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBase64,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
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
  @IsBase64({ urlSafe: true, padding: false })
  @Length(87, 87)
  p256dh!: string;

  @ApiProperty({ description: 'Browser subscription authentication secret.' })
  @IsString()
  @IsBase64({ urlSafe: true, padding: false })
  @Length(22, 22)
  auth!: string;

  @ApiPropertyOptional({ example: 'Mozilla/5.0' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}
