import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';
import { Server } from 'node:http';

interface AuthBody {
  accessToken: string;
}

interface VehicleBody {
  id: string;
  nickname: string;
}

interface PlanBody {
  id: string;
}

interface AgendaEntryBody {
  status: { overallStatus: string };
}

interface PushSubscriptionBody {
  id: string;
  endpoint: string;
  disabledAt: string | null;
}

describe('Core journeys (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;
  let registrationIpSequence = 10;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    const expressInstance = app.getHttpAdapter().getInstance() as {
      set(name: string, value: boolean): void;
    };
    expressInstance.set('trust proxy', true);
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    server = app.getHttpServer() as Server;
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.notificationDelivery.deleteMany();
    await prisma.maintenanceNotification.deleteMany();
    await prisma.pushSubscription.deleteMany();
    await prisma.expense.deleteMany();
    await prisma.maintenanceRecord.deleteMany();
    await prisma.vehicleMaintenancePlan.deleteMany();
    await prisma.odometerReading.deleteMany();
    await prisma.vehicle.deleteMany();
    await prisma.refreshSession.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => app.close());

  it('registers, authorizes and manages an owned vehicle', async () => {
    const registration = await request(server)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'strong-password-123',
      })
      .expect(201);
    const accessToken = (registration.body as AuthBody).accessToken;

    const created = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: 'My car',
        brand: 'Fiat',
        model: 'Argo',
        year: 2022,
        currentOdometerKm: 50000,
        currentOdometerRecordedAt: '2026-08-01T12:00:00.000Z',
      })
      .expect(201);

    const vehicle = created.body as VehicleBody;
    const fetched = await request(server)
      .get(`/api/v1/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((fetched.body as VehicleBody).nickname).toBe('My car');
  });

  it('hides another user vehicle as not found', async () => {
    const first = await register('first@example.com');
    const second = await register('second@example.com');
    const created = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${first}`)
      .send({
        nickname: 'Privado',
        brand: 'Fiat',
        model: 'Argo',
        year: 2022,
        currentOdometerKm: 50000,
        currentOdometerRecordedAt: '2026-08-01T12:00:00.000Z',
      })
      .expect(201);

    const vehicle = created.body as VehicleBody;
    await request(server)
      .get(`/api/v1/vehicles/${vehicle.id}`)
      .set('Authorization', `Bearer ${second}`)
      .expect(404);
  });

  it('creates, schedules and completes a maintenance plan', async () => {
    const accessToken = await register('maintenance@example.com');
    const createdVehicle = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: 'Fase 2',
        brand: 'Fiat',
        model: 'Argo',
        year: 2022,
        currentOdometerKm: 50000,
        currentOdometerRecordedAt: '2026-08-01T12:00:00.000Z',
      })
      .expect(201);
    const vehicle = createdVehicle.body as VehicleBody;

    const createdPlan = await request(server)
      .post(`/api/v1/vehicles/${vehicle.id}/maintenance-plans`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Engine oil',
        category: 'ENGINE',
        intervalMonths: 12,
        intervalKm: 10000,
      })
      .expect(201);
    const plan = createdPlan.body as PlanBody;

    const unknownAgenda = await request(server)
      .get(`/api/v1/vehicles/${vehicle.id}/maintenance-agenda`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (unknownAgenda.body as AgendaEntryBody[])[0]?.status.overallStatus,
    ).toBe('UNKNOWN');

    await request(server)
      .post(
        `/api/v1/vehicles/${vehicle.id}/maintenance-plans/${plan.id}/complete`,
      )
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        performedAt: '2026-08-10T12:00:00.000Z',
        odometerKm: 51000,
        totalCost: '299.90',
      })
      .expect(201);

    const history = await request(server)
      .get(`/api/v1/vehicles/${vehicle.id}/maintenance-records`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((history.body as { data: unknown[] }).data).toHaveLength(1);
  });

  it('records an expense and returns monthly cost totals', async () => {
    const accessToken = await register('costs@example.com');
    const createdVehicle = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: 'Cost vehicle',
        brand: 'Honda',
        model: 'Civic',
        year: 2023,
        currentOdometerKm: 10000,
        currentOdometerRecordedAt: '2026-08-01T12:00:00.000Z',
      })
      .expect(201);
    const vehicle = createdVehicle.body as VehicleBody;

    await request(server)
      .post(`/api/v1/vehicles/${vehicle.id}/expenses`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        category: 'PARTS',
        description: 'Replacement filter',
        incurredAt: '2026-08-10T12:00:00.000Z',
        amount: '75.50',
      })
      .expect(201);

    const report = await request(server)
      .get('/api/v1/reports/costs')
      .query({ vehicleId: vehicle.id, period: 'monthly' })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((report.body as { summary: { total: string } }).summary.total).toBe(
      '75.50',
    );
  });

  it('registers, isolates and disables Web Push subscriptions', async () => {
    const first = await register('push-first@example.com');
    const second = await register('push-second@example.com');
    const endpoint = 'https://fcm.googleapis.com/subscriptions/browser-one';

    const created = await request(server)
      .post('/api/v1/push-subscriptions')
      .set('Authorization', `Bearer ${first}`)
      .send({ endpoint, p256dh: 'public-key', auth: 'auth-secret' })
      .expect(201);
    const subscription = created.body as PushSubscriptionBody;
    expect(subscription.endpoint).toBe(endpoint);

    await request(server)
      .post('/api/v1/push-subscriptions')
      .set('Authorization', `Bearer ${second}`)
      .send({ endpoint, p256dh: 'other-public-key', auth: 'other-secret' })
      .expect(409);

    await request(server)
      .delete(`/api/v1/push-subscriptions/${subscription.id}`)
      .set('Authorization', `Bearer ${second}`)
      .expect(404);

    await request(server)
      .delete(`/api/v1/push-subscriptions/${subscription.id}`)
      .set('Authorization', `Bearer ${first}`)
      .expect(204);

    const listed = await request(server)
      .get('/api/v1/push-subscriptions')
      .set('Authorization', `Bearer ${first}`)
      .expect(200);
    expect(
      (listed.body as PushSubscriptionBody[])[0]?.disabledAt,
    ).not.toBeNull();
  });

  it('lists owned alerts and marks one as read', async () => {
    const email = 'alerts@example.com';
    const accessToken = await register(email);
    const anotherUserToken = await register('other-alerts@example.com');
    const createdVehicle = await request(server)
      .post('/api/v1/vehicles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        nickname: 'Alert vehicle',
        brand: 'Toyota',
        model: 'Corolla',
        year: 2024,
        currentOdometerKm: 20000,
        currentOdometerRecordedAt: '2026-08-01T12:00:00.000Z',
      })
      .expect(201);
    const vehicle = createdVehicle.body as VehicleBody;
    const createdPlan = await request(server)
      .post(`/api/v1/vehicles/${vehicle.id}/maintenance-plans`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Brake inspection',
        category: 'BRAKES',
        intervalKm: 10000,
      })
      .expect(201);
    const plan = createdPlan.body as PlanBody;
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const notification = await prisma.maintenanceNotification.create({
      data: {
        userId: user.id,
        vehicleId: vehicle.id,
        planId: plan.id,
        dedupKey: `${plan.id}:ODOMETER:DUE_SOON:30000`,
        trigger: 'ODOMETER',
        severity: 'DUE_SOON',
        title: 'Maintenance alert: Brake inspection',
        body: 'Brake inspection is due in 1,000 km.',
        reason: '1,000 km remaining until the limit',
        dueOdometerKm: 30000,
      },
    });

    const listed = await request(server)
      .get('/api/v1/notifications')
      .query({ unreadOnly: true })
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((listed.body as { data: Array<{ id: string }> }).data[0]?.id).toBe(
      notification.id,
    );

    await request(server)
      .patch(`/api/v1/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${anotherUserToken}`)
      .expect(404);

    const read = await request(server)
      .patch(`/api/v1/notifications/${notification.id}/read`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect((read.body as { readAt: string | null }).readAt).not.toBeNull();
  });

  async function register(email: string): Promise<string> {
    const response = await request(server)
      .post('/api/v1/auth/register')
      .set('X-Forwarded-For', `198.51.100.${registrationIpSequence++}`)
      .send({ name: 'Test User', email, password: 'strong-password-123' })
      .expect(201);
    return (response.body as AuthBody).accessToken;
  }
});
