import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/models';
import { migrateUp, migrateDown, clearAll } from '../helpers/db';
import { seedPokemon } from '../../src/seeders/pokemon.seeder';

beforeAll(async () => {
  await migrateDown();
  await migrateUp();
  await seedPokemon(); // need pokemon catalog
});
beforeEach(async () => {
  // Truncate user data but keep pokemon catalog
  await sequelize.query(
    'TRUNCATE TABLE caught_pokemon, transactions, tasks, task_series, child_profiles, users RESTART IDENTITY CASCADE'
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
    .send({ username: 'kid1', password: 'pass123', displayName: 'Kid One' });
  const childId: number = childRes.body.id;

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: 'kid1', password: 'pass123' });
  const childToken: string = loginRes.body.token;

  return { adminToken, childToken, childId };
}

// ── Starters endpoint ─────────────────────────────────────────────────────────
describe('GET /api/pokemon/starters', () => {
  it('returns 4 starter options', async () => {
    const { childToken } = await setup();
    const res = await request(app)
      .get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
    expect(res.body.every((p: any) => p.unlockXp === 0)).toBe(true);
  });
});

// ── Choose initial (HU-17) ────────────────────────────────────────────────────
describe('POST /api/pokemon/choose-initial', () => {
  it('creates CaughtPokemon with isActive=true', async () => {
    const { childToken } = await setup();

    const starters = await request(app)
      .get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    const starterId: number = starters.body[0].id;

    const res = await request(app)
      .post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ pokemonId: starterId });
    expect(res.status).toBe(201);
    expect(res.body.isActive).toBe(true);
    expect(res.body.pokemonXp).toBe(0);
  });

  it('409 if onboarding already completed', async () => {
    const { childToken } = await setup();
    const starters = await request(app)
      .get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    const id: number = starters.body[0].id;
    await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`).send({ pokemonId: id });

    const res = await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`).send({ pokemonId: id });
    expect(res.status).toBe(409);
  });
});

// ── Collection + XP from task (HU-18/19) ─────────────────────────────────────
describe('GET /api/pokemon and XP via task approval', () => {
  it('active pokemon XP increases when task approved', async () => {
    const { adminToken, childId, childToken } = await setup();

    // Choose starter
    const starters = await request(app)
      .get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`).send({ pokemonId: starters.body[0].id });

    // Approve a task → XP goes to pokemon
    const taskRes = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ assignedTo: childId, title: 'T', type: 'hogar', coinsReward: 5, xpReward: 100, frequency: 'OneTime' });
    await request(app).post(`/api/tasks/${taskRes.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${taskRes.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const colRes = await request(app).get('/api/pokemon')
      .set('Authorization', `Bearer ${childToken}`);
    expect(colRes.status).toBe(200);
    expect(colRes.body.active).toBeDefined();
    expect(colRes.body.active.pokemonXp).toBe(100);
  });
});

// ── Change active (HU-21) ─────────────────────────────────────────────────────
describe('PUT /api/pokemon/active', () => {
  it('changes active pokemon', async () => {
    const { adminToken, childId, childToken } = await setup();

    // Choose starter + get enough XP to capture
    const starters = await request(app).get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`).send({ pokemonId: starters.body[0].id });

    // Give 5000 XP and capture another
    for (let i = 0; i < 5; i++) {
      const t = await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: childId, title: `T${i}`, type: 'hogar', coinsReward: 5, xpReward: 1000, frequency: 'OneTime' });
      await request(app).post(`/api/tasks/${t.body.id}/complete`)
        .set('Authorization', `Bearer ${childToken}`);
      await request(app).post(`/api/tasks/${t.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    // Get available and capture one
    const avail = await request(app).get('/api/pokemon/available')
      .set('Authorization', `Bearer ${childToken}`);
    expect(avail.body.length).toBeGreaterThan(0);

    const captureRes = await request(app).post('/api/pokemon/capture')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ pokemonId: avail.body[0].id });
    expect(captureRes.status).toBe(201);

    // Change active to captured pokemon
    const setRes = await request(app).put('/api/pokemon/active')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ caughtPokemonId: captureRes.body.id });
    expect(setRes.status).toBe(200);
  });
});

// ── Capture slots after evolution (regression HU-20) ─────────────────────────
describe('pendingCaptures after evolution', () => {
  it('evolved form does not consume a capture slot', async () => {
    const { adminToken, childId, childToken } = await setup();

    // Choose Charmander (evolutionOrder=1, evolvesAtLevel=16)
    const starters = await request(app).get('/api/pokemon/starters')
      .set('Authorization', `Bearer ${childToken}`);
    const charmander = starters.body.find((p: any) => p.name === 'Charmander');
    await request(app).post('/api/pokemon/choose-initial')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ pokemonId: charmander.id });

    // Give enough XP to reach level 16 (16^3 = 4096) AND unlock a capture (5000 XP)
    // We approve tasks totalling 11000 XP to cover both thresholds
    for (let i = 0; i < 11; i++) {
      const t = await request(app).post('/api/tasks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedTo: childId, title: `T${i}`, type: 'hogar', coinsReward: 0, xpReward: 1000, frequency: 'OneTime' });
      await request(app).post(`/api/tasks/${t.body.id}/complete`)
        .set('Authorization', `Bearer ${childToken}`);
      await request(app).post(`/api/tasks/${t.body.id}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);
    }

    // Balance should reflect 2 pending captures (11000 XP → maxPokemon=3, caughtCount=1)
    // even though Charmeleon evolved and added a second row to caught_pokemon
    const balanceRes = await request(app).get('/api/activity/balance')
      .set('Authorization', `Bearer ${childToken}`);
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.maxPokemon).toBe(3);
    expect(balanceRes.body.caughtCount).toBe(1);
    expect(balanceRes.body.pendingCaptures).toBe(2);
  });
});
