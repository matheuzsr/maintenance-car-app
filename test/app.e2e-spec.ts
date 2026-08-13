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

describe('Core journeys (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let server: Server;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
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

  async function register(email: string): Promise<string> {
    const response = await request(server)
      .post('/api/v1/auth/register')
      .send({ name: 'Test User', email, password: 'strong-password-123' })
      .expect(201);
    return (response.body as AuthBody).accessToken;
  }
});
