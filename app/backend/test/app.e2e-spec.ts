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
  refreshToken?: string;
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

  it('keeps refresh tokens in a rotating HttpOnly cookie and revokes on logout', async () => {
    const agent = request.agent(server);
    const registration = await agent
      .post('/api/v1/auth/register')
      .set('Origin', 'http://localhost:3001')
      .send({
        name: 'Cookie User',
        email: 'cookies@example.com',
        password: 'strong-password-123',
      })
      .expect(201);

    expect((registration.body as AuthBody).refreshToken).toBeUndefined();
    const registrationCookie = cookieHeader(registration.headers['set-cookie']);
    expect(registrationCookie).toContain('maintenance_refresh=');
    expect(registrationCookie).toContain('Path=/api/v1/auth');
    expect(registrationCookie).toContain('HttpOnly');
    expect(registrationCookie).toContain('SameSite=Strict');
    expect(registrationCookie).not.toContain('Domain=');
    expect(registrationCookie).not.toContain('Secure');

    const refreshed = await agent
      .post('/api/v1/auth/refresh')
      .set('Origin', 'http://localhost:3001')
      .send()
      .expect(200);
    expect((refreshed.body as AuthBody).accessToken).toEqual(
      expect.any(String),
    );
    expect((refreshed.body as AuthBody).refreshToken).toBeUndefined();
    const rotatedCookie = cookieHeader(refreshed.headers['set-cookie']);
    expect(rotatedCookie).toContain('maintenance_refresh=');
    expect(rotatedCookie.split(';')[0]).not.toBe(
      registrationCookie.split(';')[0],
    );

    const sessionsBeforeLogout = await prisma.refreshSession.findMany({
      orderBy: { createdAt: 'asc' },
    });
    expect(sessionsBeforeLogout).toHaveLength(2);
    expect(sessionsBeforeLogout[0]?.revokedAt).not.toBeNull();
    expect(sessionsBeforeLogout[1]?.revokedAt).toBeNull();

    const logout = await agent
      .post('/api/v1/auth/logout')
      .set('Origin', 'http://localhost:3001')
      .send()
      .expect(200);
    expect(logout.body).toEqual({ success: true });
    const clearedCookie = cookieHeader(logout.headers['set-cookie']);
    expect(clearedCookie).toContain('maintenance_refresh=;');
    expect(clearedCookie).toContain('Path=/api/v1/auth');
    expect(clearedCookie).toContain('HttpOnly');
    expect(clearedCookie).toContain('SameSite=Strict');

    await agent.post('/api/v1/auth/refresh').send().expect(401);
    expect(
      await prisma.refreshSession.count({ where: { revokedAt: null } }),
    ).toBe(0);
  });

  it('rejects refresh without a cookie and cross-origin auth requests', async () => {
    await request(server).post('/api/v1/auth/refresh').send().expect(401);
    await request(server)
      .post('/api/v1/auth/login')
      .set('Origin', 'https://evil.example')
      .send({ email: 'missing@example.com', password: 'strong-password-123' })
      .expect(403);
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
    const p256dh = Buffer.alloc(65).toString('base64url');
    const auth = Buffer.alloc(16).toString('base64url');

    const created = await request(server)
      .post('/api/v1/push-subscriptions')
      .set('Authorization', `Bearer ${first}`)
      .send({ endpoint, p256dh, auth })
      .expect(201);
    const subscription = created.body as PushSubscriptionBody;
    expect(subscription.endpoint).toBe(endpoint);

    await request(server)
      .post('/api/v1/push-subscriptions')
      .set('Authorization', `Bearer ${second}`)
      .send({ endpoint, p256dh, auth })
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

  function cookieHeader(value: string[] | string | undefined): string {
    if (!value) throw new Error('Expected a Set-Cookie response header');
    return Array.isArray(value) ? (value[0] ?? '') : value;
  }
});
