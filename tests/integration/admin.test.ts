import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/models';
import { migrateUp, migrateDown } from '../helpers/db';
import { seedPokemon } from '../../src/seeders/pokemon.seeder';

beforeAll(async () => {
  await migrateDown();
  await migrateUp();
  await seedPokemon();
});

beforeEach(async () => {
  await sequelize.query(
    'TRUNCATE TABLE reward_requests, caught_pokemon, transactions, tasks, task_series, child_profiles, users RESTART IDENTITY CASCADE'
  );
});

afterAll(async () => { await sequelize.close(); });

// ── Helpers ───────────────────────────────────────────────────────────────────
async function setup() {
  const adminRes = await request(app).post('/api/auth/register').send({
    email: 'admin@test.com', username: 'admin1',
    password: 'Password1', confirmPassword: 'Password1',
  });
  const adminToken: string = adminRes.body.token;

  const childRes = await request(app)
    .post('/api/auth/children')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ username: 'kid1', password: 'pass123', displayName: 'Kid One', avatarColor: '#FF0000' });
  const childId: number = childRes.body.id;

  const loginRes = await request(app).post('/api/auth/login')
    .send({ identifier: 'kid1', password: 'pass123' });
  const childToken: string = loginRes.body.token;

  return { adminToken, childToken, childId };
}

// ── Dashboard (HU-29) ─────────────────────────────────────────────────────────
describe('GET /api/admin/dashboard', () => {
  it('returns children list, totalInReview, totalPendingRequests', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('children');
    expect(res.body).toHaveProperty('totalInReview');
    expect(res.body).toHaveProperty('totalPendingRequests');
    expect(res.body.children).toHaveLength(1);
    expect(res.body.children[0]).toMatchObject({ username: 'kid1', coins: 0, xp: 0 });
  });

  it('totalInReview reflects tasks awaiting review', async () => {
    const { adminToken, childId, childToken } = await setup();

    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 5, xpReward: 5, frequency: 'OneTime' });
    await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);

    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.totalInReview).toBe(1);
    expect(res.body.children[0].pendingReviewCount).toBe(1);
  });

  it('403 when child tries to access dashboard', async () => {
    const { childToken } = await setup();
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(403);
  });
});

// ── Notifications (HU-32) ─────────────────────────────────────────────────────
describe('GET /api/admin/notifications', () => {
  it('returns inReview and pendingRequests counts', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .get('/api/admin/notifications')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ inReview: 0, pendingRequests: 0 });
  });
});

// ── Children management (HU-30) ───────────────────────────────────────────────
describe('GET /api/admin/children', () => {
  it('returns list with profile data', async () => {
    const { adminToken } = await setup();
    const res = await request(app)
      .get('/api/admin/children')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toHaveProperty('displayName', 'Kid One');
    expect(res.body[0]).toHaveProperty('coins');
    expect(res.body[0]).toHaveProperty('xp');
  });
});

describe('PUT /api/admin/children/:id', () => {
  it('admin updates child displayName', async () => {
    const { adminToken, childId } = await setup();
    const res = await request(app)
      .put(`/api/admin/children/${childId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ displayName: 'New Name' });
    expect(res.status).toBe(200);

    const detail = await request(app)
      .get(`/api/admin/children/${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detail.body.displayName).toBe('New Name');
  });

  it('admin can change child password', async () => {
    const { adminToken, childId } = await setup();
    await request(app)
      .put(`/api/admin/children/${childId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'NewPass1' });

    const loginRes = await request(app).post('/api/auth/login')
      .send({ identifier: 'kid1', password: 'NewPass1' });
    expect(loginRes.status).toBe(200);
  });
});

describe('PATCH /api/admin/children/:id/status', () => {
  it('deactivates and reactivates child account', async () => {
    const { adminToken, childId, childToken } = await setup();

    // Deactivate
    await request(app)
      .patch(`/api/admin/children/${childId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });

    // Child login should fail
    const loginRes = await request(app).post('/api/auth/login')
      .send({ identifier: 'kid1', password: 'pass123' });
    expect(loginRes.status).toBe(401);

    // Reactivate
    await request(app)
      .patch(`/api/admin/children/${childId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: true });

    const loginRes2 = await request(app).post('/api/auth/login')
      .send({ identifier: 'kid1', password: 'pass123' });
    expect(loginRes2.status).toBe(200);
  });
});

// ── Child detail (HU-31/33) ───────────────────────────────────────────────────
describe('GET /api/admin/children/:id', () => {
  it('returns child summary with pokemon=null before onboarding', async () => {
    const { adminToken, childId } = await setup();
    const res = await request(app)
      .get(`/api/admin/children/${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: childId, username: 'kid1' });
    expect(res.body.activePokemon).toBeNull();
  });

  it('returns active pokemon after onboarding — HU-33', async () => {
    const { adminToken, childId, childToken } = await setup();

    const starters = await request(app).get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ pokemonId: starters.body[0].id });

    const res = await request(app)
      .get(`/api/admin/children/${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.activePokemon).not.toBeNull();
    expect(res.body.activePokemon).toHaveProperty('name');
    expect(res.body.activePokemon).toHaveProperty('level');
  });
});

// ── Admin sees child pokemon collection (HU-33) ───────────────────────────────
describe('GET /api/pokemon?childId=X (admin)', () => {
  it('returns child collection via admin token', async () => {
    const { adminToken, childId, childToken } = await setup();

    const starters = await request(app).get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ pokemonId: starters.body[0].id });

    const res = await request(app)
      .get(`/api/pokemon?childId=${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.collection).toHaveLength(1);
    expect(res.body.active).not.toBeNull();
  });
});
