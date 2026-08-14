ALTER TABLE "maintenance_records"
DROP CONSTRAINT "maintenance_records_odometer_reading_id_fkey";

CREATE UNIQUE INDEX "odometer_readings_id_user_id_vehicle_id_key"
ON "odometer_readings"("id", "user_id", "vehicle_id");

CREATE UNIQUE INDEX "maintenance_records_odometer_reading_id_user_id_vehicle_id_key"
ON "maintenance_records"("odometer_reading_id", "user_id", "vehicle_id");

ALTER TABLE "maintenance_records"
ADD CONSTRAINT "maintenance_records_odometer_reading_id_user_id_vehicle_id_fkey"
FOREIGN KEY ("odometer_reading_id", "user_id", "vehicle_id")
REFERENCES "odometer_readings"("id", "user_id", "vehicle_id")
ON DELETE RESTRICT ON UPDATE CASCADE;
