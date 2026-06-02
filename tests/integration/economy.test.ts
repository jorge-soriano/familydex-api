import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/models';
import { migrateUp, migrateDown, clearAll } from '../helpers/db';

beforeAll(async () => { await migrateDown(); await migrateUp(); });
beforeEach(async () => await clearAll());
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
    .send({ username: 'kid1', password: 'pass123', displayName: 'Kid One' });
  const childId: number = childRes.body.id;

  const loginRes = await request(app).post('/api/auth/login')
    .send({ identifier: 'kid1', password: 'pass123' });
  const childToken: string = loginRes.body.token;

  return { adminToken, childToken, childId };
}

// ── Balance (HU-14) ───────────────────────────────────────────────────────────
describe('GET /api/economy/balance', () => {
  it('child gets own balance (starts at 0/0)', async () => {
    const { childToken } = await setup();
    const res = await request(app)
      .get('/api/economy/balance')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ coins: 0, xp: 0, maxPokemon: 0 });
  });

  it('balance updates after task approval', async () => {
    const { adminToken, childId, childToken } = await setup();

    // Create + complete + approve task
    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 15, xpReward: 30, frequency: 'OneTime' });
    await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${taskRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/economy/balance')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.body).toMatchObject({ coins: 15, xp: 30 });
  });

  it('admin can get balance for a specific child', async () => {
    const { adminToken, childId } = await setup();
    const res = await request(app)
      .get(`/api/economy/balance?childId=${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('coins');
  });

  it('401 without token', async () => {
    const res = await request(app).get('/api/economy/balance');
    expect(res.status).toBe(401);
  });
});

// ── Penalty (HU-13) ───────────────────────────────────────────────────────────
describe('POST /api/economy/penalty', () => {
  it('deducts coins and coins never go negative', async () => {
    const { adminToken, childId, childToken } = await setup();

    // First give some coins
    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 20, xpReward: 10, frequency: 'OneTime' });
    const completeRes = await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${completeRes.body.id ?? taskRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    // Apply penalty larger than balance
    const res = await request(app)
      .post('/api/economy/penalty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, amount: 100, reason: 'Mal comportamiento' });
    expect(res.status).toBe(200);

    // Balance should be 0, not negative
    const balRes = await request(app)
      .get(`/api/economy/balance?childId=${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(balRes.body.coins).toBe(0);
  });

  it('XP is not affected by penalty', async () => {
    const { adminToken, childId, childToken } = await setup();

    // Give XP via task
    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 5, xpReward: 50, frequency: 'OneTime' });
    await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${taskRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    await request(app).post('/api/economy/penalty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, amount: 5, reason: 'test' });

    const balRes = await request(app)
      .get(`/api/economy/balance?childId=${childId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(balRes.body.xp).toBe(50);   // XP unchanged
    expect(balRes.body.coins).toBe(0); // Coins deducted
  });

  it('400 when amount <= 0', async () => {
    const { adminToken, childId } = await setup();
    const res = await request(app).post('/api/economy/penalty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, amount: 0, reason: 'test' });
    expect(res.status).toBe(400);
  });

  it('403 when child not in admin family', async () => {
    const { adminToken } = await setup();
    const res = await request(app).post('/api/economy/penalty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId: 9999, amount: 10, reason: 'test' });
    expect(res.status).toBe(403);
  });

  it('403 when called by a child', async () => {
    const { childToken, childId } = await setup();
    const res = await request(app).post('/api/economy/penalty')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId, amount: 5, reason: 'test' });
    expect(res.status).toBe(403);
  });
});

// ── Transaction history (HU-15, HU-16) ────────────────────────────────────────
describe('GET /api/economy/transactions', () => {
  it('child gets own transaction history after task approval', async () => {
    const { adminToken, childId, childToken } = await setup();

    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 10, xpReward: 20, frequency: 'OneTime' });
    await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${taskRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/economy/transactions')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ type: 'TaskReward', coinsDelta: 10, xpDelta: 20 });
  });

  it('child can filter by type', async () => {
    const { childToken } = await setup();
    const res = await request(app)
      .get('/api/economy/transactions?type=Penalty')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('admin sees all family transactions', async () => {
    const { adminToken, childId, childToken } = await setup();

    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 5, xpReward: 5, frequency: 'OneTime' });
    await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${taskRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .get('/api/economy/transactions')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
