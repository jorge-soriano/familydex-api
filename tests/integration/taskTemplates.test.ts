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
    `TRUNCATE TABLE task_templates, reward_requests, caught_pokemon, transactions,
     tasks, task_series, child_profiles, users RESTART IDENTITY CASCADE`
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
    .send({ username: 'kid1', password: 'pass123', displayName: 'Kid' });
  const childId: number = childRes.body.id;

  const loginRes = await request(app).post('/api/auth/login')
    .send({ identifier: 'kid1', password: 'pass123' });
  return { adminToken, childToken: loginRes.body.token as string, childId };
}

const baseTemplate = { title: 'Hacer la cama', type: 'hogar', coinsReward: 10, xpReward: 50 };

// ── CRUD ──────────────────────────────────────────────────────────────────────
describe('POST /api/task-templates', () => {
  it('admin creates template → 201', async () => {
    const { adminToken } = await setup();
    const res = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Hacer la cama', isActive: true });
  });

  it('403 when child tries to create template', async () => {
    const { childToken } = await setup();
    const res = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${childToken}`).send(baseTemplate);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/task-templates', () => {
  it('returns only family templates', async () => {
    const { adminToken } = await setup();
    await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);

    const res = await request(app).get('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('PUT /api/task-templates/:id', () => {
  it('admin edits template', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);

    const res = await request(app).put(`/api/task-templates/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`).send({ title: 'Tender la cama' });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Tender la cama');
  });
});

describe('PATCH /api/task-templates/:id/status', () => {
  it('deactivates template', async () => {
    const { adminToken } = await setup();
    const create = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);

    await request(app).patch(`/api/task-templates/${create.body.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`).send({ isActive: false });

    const res = await request(app).get('/api/task-templates?active=true')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body).toHaveLength(0);
  });
});

// ── Crear misión desde plantilla ──────────────────────────────────────────────
describe('POST /api/task-templates/:id/create-task', () => {
  it('creates Pending task from template', async () => {
    const { adminToken, childId } = await setup();
    const tpl = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);

    const res = await request(app)
      .post(`/api/task-templates/${tpl.body.id}/create-task`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('Pending');
    expect(res.body.coinsReward).toBe(10);
  });

  it('overrides coinsReward from template', async () => {
    const { adminToken, childId } = await setup();
    const tpl = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);

    const res = await request(app)
      .post(`/api/task-templates/${tpl.body.id}/create-task`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, coinsReward: 25 });
    expect(res.body.coinsReward).toBe(25);
  });
});

// ── Registrar logro desde plantilla ──────────────────────────────────────────
describe('POST /api/task-templates/:id/quick-complete', () => {
  it('creates Approved task and awards XP/coins', async () => {
    const { adminToken, childId, childToken } = await setup();
    const tpl = await request(app).post('/api/task-templates')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTemplate);

    const res = await request(app)
      .post(`/api/task-templates/${tpl.body.id}/quick-complete`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId });
    expect(res.status).toBe(201);
    expect(res.body.task.status).toBe('Approved');

    const bal = await request(app).get('/api/economy/balance')
      .set('Authorization', `Bearer ${childToken}`);
    expect(bal.body.coins).toBe(10);
    expect(bal.body.xp).toBe(50);
  });
});

// ── POST /api/tasks/quick-complete ────────────────────────────────────────────
describe('POST /api/tasks/quick-complete', () => {
  it('admin registers achievement → 201 Approved + balance updated', async () => {
    const { adminToken, childId, childToken } = await setup();

    const res = await request(app).post('/api/tasks/quick-complete')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, title: 'Notable en mates', type: 'deberes', coinsReward: 30, xpReward: 150 });
    expect(res.status).toBe(201);
    expect(res.body.task.status).toBe('Approved');

    const bal = await request(app).get('/api/economy/balance')
      .set('Authorization', `Bearer ${childToken}`);
    expect(bal.body.coins).toBe(30);
    expect(bal.body.xp).toBe(150);
  });

  it('403 when called by a child', async () => {
    const { childToken, childId } = await setup();
    const res = await request(app).post('/api/tasks/quick-complete')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId, title: 'T', type: 'hogar', coinsReward: 5, xpReward: 5 });
    expect(res.status).toBe(403);
  });
});

// ── POST /api/economy/direct-reward ──────────────────────────────────────────
describe('POST /api/economy/direct-reward', () => {
  it('awards coins and XP without creating a task', async () => {
    const { adminToken, childId, childToken } = await setup();

    const res = await request(app).post('/api/economy/direct-reward')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, coins: 10, xp: 50, reason: 'Buen comportamiento' });
    expect(res.status).toBe(200);

    const bal = await request(app).get('/api/economy/balance')
      .set('Authorization', `Bearer ${childToken}`);
    expect(bal.body.coins).toBe(10);
    expect(bal.body.xp).toBe(50);

    const hist = await request(app).get('/api/economy/transactions?type=DirectReward')
      .set('Authorization', `Bearer ${childToken}`);
    expect(hist.body).toHaveLength(1);
  });

  it('400 when both coins and xp are 0', async () => {
    const { adminToken, childId } = await setup();
    const res = await request(app).post('/api/economy/direct-reward')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ childId, coins: 0, xp: 0, reason: 'nada' });
    expect(res.status).toBe(400);
  });

  it('403 when called by a child', async () => {
    const { childToken, childId } = await setup();
    const res = await request(app).post('/api/economy/direct-reward')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ childId, coins: 5, xp: 0, reason: 'trampa' });
    expect(res.status).toBe(403);
  });
});
