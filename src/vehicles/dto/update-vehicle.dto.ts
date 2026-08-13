import { PartialType, PickType } from '@nestjs/swagger';
import { CreateVehicleDto } from './create-vehicle.dto';

export class UpdateVehicleDto extends PartialType(
  PickType(CreateVehicleDto, [
    'nickname',
    'brand',
    'model',
    'year',
    'licensePlate',
  ] as const),
) {}
