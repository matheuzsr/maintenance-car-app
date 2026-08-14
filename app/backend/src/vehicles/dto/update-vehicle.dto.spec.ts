import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateVehicleDto } from './update-vehicle.dto';

describe('UpdateVehicleDto', () => {
  it('accepts null to explicitly clear a license plate', async () => {
    const dto = plainToInstance(UpdateVehicleDto, { licensePlate: null });
    await expect(validate(dto)).resolves.toEqual([]);
  });

  it('still rejects a non-string license plate', async () => {
    const dto = plainToInstance(UpdateVehicleDto, { licensePlate: 123 });
    await expect(validate(dto)).resolves.not.toEqual([]);
  });
});
