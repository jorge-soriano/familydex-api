import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/models';
import { migrateUp, migrateDown, clearAll } from '../helpers/db';
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
  const adminPayload = JSON.parse(Buffer.from(adminToken.split('.')[1], 'base64').toString());

  const childRes = await request(app)
    .post('/api/auth/children')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ username: 'kid1', password: 'pass123', displayName: 'Kid One' });
  const childId: number = childRes.body.id;

  const loginRes = await request(app).post('/api/auth/login').send({ identifier: 'kid1', password: 'pass123' });
  const childToken: string = loginRes.body.token;

  return { adminToken, childToken, childId, adminFamilyId: adminPayload.familyId };
}

async function giveCoins(adminToken: string, childId: number, childToken: string, coins = 50) {
  const taskRes = await request(app).post('/api/tasks')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: coins, xpReward: 5, frequency: 'OneTime' });
  await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
    .set('Authorization', `Bearer ${childToken}`);
  await request(app).post(`/api/tasks/${taskRes.body.id}/approve`)
    .set('Authorization', `Bearer ${adminToken}`);
}

// ── Reward CRUD (HU-22, HU-23, HU-24) ────────────────────────────────────────
describe('POST /api/rewards', () => {
  it('admin creates a reward → 201', async () => {
    const { adminToken } = await setup();
    const res = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: '30 min pantalla', coinCost: 30 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: '30 min pantalla', coinCost: 30, isActive: true });
  });

  it('400 when coinCost is 0', async () => {
    const { adminToken } = await setup();
    const res = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'gratis', coinCost: 0 });
    expect(res.status).toBe(400);
  });

  it('403 when child tries to create a reward', async () => {
    const { childToken } = await setup();
    const res = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ name: 'X', coinCost: 10 });
    expect(res.status).toBe(403);
  });
});

describe('PATCH /api/rewards/:id/status', () => {
  it('admin toggles reward inactive — child no longer sees it', async () => {
    const { adminToken, childToken } = await setup();
    const create = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'X', coinCost: 10 });

    await request(app).patch(`/api/rewards/${create.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`).send({ isActive: false });

    const childRes = await request(app).get('/api/rewards')
      .set('Authorization', `Bearer ${childToken}`);
    expect(childRes.body.find((r: any) => r.id === create.body.id)).toBeUndefined();
  });
});

// ── Child shop (HU-25) ────────────────────────────────────────────────────────
describe('GET /api/rewards (child)', () => {
  it('child only sees active rewards', async () => {
    const { adminToken, childToken } = await setup();
    await request(app).post('/api/rewards').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'activa', coinCost: 20 });
    await request(app).post('/api/rewards').set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'inactiva', coinCost: 10, isActive: false });

    const res = await request(app).get('/api/rewards').set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every((r: any) => r.isActive)).toBe(true);
  });
});

// ── Request reward (HU-26) ────────────────────────────────────────────────────
describe('POST /api/rewards/requests', () => {
  it('child requests reward — coins reserved but NOT deducted', async () => {
    const { adminToken, childToken, childId } = await setup();
    await giveCoins(adminToken, childId, childToken, 50);

    const reward = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'X', coinCost: 30 });

    const res = await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ rewardId: reward.body.id });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    expect(res.body.coinsReserved).toBe(30);

    // Balance still 50 — coins not deducted yet
    const bal = await request(app).get('/api/economy/balance').set('Authorization', `Bearer ${childToken}`);
    expect(bal.body.coins).toBe(50);
  });

  it('409 when duplicate pending request for same reward', async () => {
    const { adminToken, childToken, childId } = await setup();
    await giveCoins(adminToken, childId, childToken, 100);

    const reward = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'X', coinCost: 30 });

    await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`).send({ rewardId: reward.body.id });

    const res = await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`).send({ rewardId: reward.body.id });
    expect(res.status).toBe(409);
  });

  it('400 when insufficient balance (considering other reservations)', async () => {
    const { adminToken, childToken, childId } = await setup();
    await giveCoins(adminToken, childId, childToken, 40);

    const r1 = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'R1', coinCost: 30 });
    const r2 = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'R2', coinCost: 20 });

    // First request uses 30 coins (reserved)
    await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`).send({ rewardId: r1.body.id });

    // Second request: effective balance = 40 - 30 = 10 < 20
    const res = await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`).send({ rewardId: r2.body.id });
    expect(res.status).toBe(400);
  });
});

// ── Approve (HU-27) ───────────────────────────────────────────────────────────
describe('POST /api/rewards/requests/:id/approve', () => {
  it('deducts coins from child balance and records Transaction', async () => {
    const { adminToken, childToken, childId } = await setup();
    await giveCoins(adminToken, childId, childToken, 50);

    const reward = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'X', coinCost: 30 });
    const reqRes = await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`).send({ rewardId: reward.body.id });

    const approveRes = await request(app)
      .post(`/api/rewards/requests/${reqRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(approveRes.status).toBe(200);
    expect(approveRes.body.status).toBe('Approved');

    // Balance now 50 - 30 = 20
    const bal = await request(app).get('/api/economy/balance').set('Authorization', `Bearer ${childToken}`);
    expect(bal.body.coins).toBe(20);

    // Transaction recorded
    const hist = await request(app).get('/api/economy/transactions?type=RewardRedeemed')
      .set('Authorization', `Bearer ${childToken}`);
    expect(hist.body.length).toBe(1);
    expect(hist.body[0].coinsDelta).toBe(-30);
  });
});

// ── Reject (HU-28) ────────────────────────────────────────────────────────────
describe('POST /api/rewards/requests/:id/reject', () => {
  it('returns reserved coins — balance unchanged after rejection', async () => {
    const { adminToken, childToken, childId } = await setup();
    await giveCoins(adminToken, childId, childToken, 50);

    const reward = await request(app).post('/api/rewards')
      .set('Authorization', `Bearer ${adminToken}`).send({ name: 'X', coinCost: 30 });
    const reqRes = await request(app).post('/api/rewards/requests')
      .set('Authorization', `Bearer ${childToken}`).send({ rewardId: reward.body.id });

    const rejectRes = await request(app)
      .post(`/api/rewards/requests/${reqRes.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Por ahora no' });
    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.status).toBe('Rejected');
    expect(rejectRes.body.rejectionReason).toBe('Por ahora no');

    // Balance still 50 — coins were reserved but never deducted
    const bal = await request(app).get('/api/economy/balance').set('Authorization', `Bearer ${childToken}`);
    expect(bal.body.coins).toBe(50);
  });
});
