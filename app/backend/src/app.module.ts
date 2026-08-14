import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { envValidationSchema } from './config/env.validation';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { MaintenanceTemplatesModule } from './maintenance-templates/maintenance-templates.module';
import { MaintenancePlansModule } from './maintenance-plans/maintenance-plans.module';
import { MaintenanceRecordsModule } from './maintenance-records/maintenance-records.module';
import { RemindersModule } from './reminders/reminders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PrismaModule,
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AuthModule,
    UsersModule,
    VehiclesModule,
    MaintenanceTemplatesModule,
    MaintenancePlansModule,
    MaintenanceRecordsModule,
    RemindersModule,
    ExpensesModule,
    ReportsModule,
    NotificationsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
