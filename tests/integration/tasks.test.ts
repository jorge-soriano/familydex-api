import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/models';
import { migrateUp, migrateDown, clearAll } from '../helpers/db';

beforeAll(async () => { await migrateDown(); await migrateUp(); });
beforeEach(async () => await clearAll());
afterAll(async () => { await sequelize.close(); });

// ── Helpers ──────────────────────────────────────────────────────────────────

async function registerAdmin(email = 'admin@test.com') {
  const res = await request(app).post('/api/auth/register').send({
    email, username: 'admin1', password: 'Password1', confirmPassword: 'Password1',
  });
  return res.body.token as string;
}

async function createChild(adminToken: string, username = 'kid1') {
  const res = await request(app)
    .post('/api/auth/children')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ username, password: 'pass123', displayName: 'Kid One' });
  const childId = res.body.id as number;

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ identifier: username, password: 'pass123' });
  return { childId, childToken: loginRes.body.token as string };
}

const baseTask = (childId: number) => ({
  assignedTo: childId,
  title: 'Tender la cama',
  type: 'hogar',
  coinsReward: 10,
  xpReward: 20,
  frequency: 'OneTime',
});

// ── Create task (HU-05) ───────────────────────────────────────────────────────

describe('POST /api/tasks', () => {
  it('admin creates a task → 201', async () => {
    const adminToken = await registerAdmin();
    const { childId } = await createChild(adminToken);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseTask(childId));
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: 'Tender la cama', status: 'Pending' });
  });

  it('403 when child tries to create a task', async () => {
    const adminToken = await registerAdmin();
    const { childId, childToken } = await createChild(adminToken);

    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${childToken}`)
      .send(baseTask(childId));
    expect(res.status).toBe(403);
  });

  it('404 when assignedTo is not in family', async () => {
    const adminToken = await registerAdmin();
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(baseTask(999));
    expect(res.status).toBe(404);
  });
});

// ── List tasks (HU-08, HU-12) ─────────────────────────────────────────────────

describe('GET /api/tasks', () => {
  it('child sees only their own tasks', async () => {
    const adminToken = await registerAdmin();
    const { childId, childToken } = await createChild(adminToken);
    await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].assignedTo).toBe(childId);
  });

  it('admin can filter by status', async () => {
    const adminToken = await registerAdmin();
    const { childId } = await createChild(adminToken);
    await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .get('/api/tasks?status=Pending')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.every((t: any) => t.status === 'Pending')).toBe(true);
  });
});

// ── Complete task (HU-09) ─────────────────────────────────────────────────────

describe('POST /api/tasks/:id/complete', () => {
  it('child marks task as InReview', async () => {
    const adminToken = await registerAdmin();
    const { childId, childToken } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .post(`/api/tasks/${create.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('InReview');
  });

  it('403 when admin tries to complete a task', async () => {
    const adminToken = await registerAdmin();
    const { childId } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .post(`/api/tasks/${create.body.id}/complete`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(403);
  });
});

// ── Approve task (HU-10) ─────────────────────────────────────────────────────

describe('POST /api/tasks/:id/approve', () => {
  it('approves task and awards coins/xp to child', async () => {
    const adminToken = await registerAdmin();
    const { childId, childToken } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));
    await request(app).post(`/api/tasks/${create.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);

    const res = await request(app)
      .post(`/api/tasks/${create.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Approved');
  });

  it('400 when task is not InReview', async () => {
    const adminToken = await registerAdmin();
    const { childId } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .post(`/api/tasks/${create.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});

// ── Reject task (HU-11) ──────────────────────────────────────────────────────

describe('POST /api/tasks/:id/reject', () => {
  it('rejects task and returns it to Pending with reason', async () => {
    const adminToken = await registerAdmin();
    const { childId, childToken } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));
    await request(app).post(`/api/tasks/${create.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);

    const res = await request(app)
      .post(`/api/tasks/${create.body.id}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'No está bien hecha' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('Pending');
    expect(res.body.rejectionReason).toBe('No está bien hecha');
  });
});

// ── Edit/Delete task (HU-06, HU-07) ──────────────────────────────────────────

describe('PUT /api/tasks/:id', () => {
  it('admin edits a pending task', async () => {
    const adminToken = await registerAdmin();
    const { childId } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .put(`/api/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Nuevo título', coinsReward: 15 });
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Nuevo título');
  });
});

describe('DELETE /api/tasks/:id', () => {
  it('admin deletes a pending task → 204', async () => {
    const adminToken = await registerAdmin();
    const { childId } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));

    const res = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(204);
  });

  it('400 when trying to delete an Approved task', async () => {
    const adminToken = await registerAdmin();
    const { childId, childToken } = await createChild(adminToken);
    const create = await request(app).post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`).send(baseTask(childId));
    await request(app).post(`/api/tasks/${create.body.id}/complete`)
      .set('Authorization', `Bearer ${childToken}`);
    await request(app).post(`/api/tasks/${create.body.id}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);

    const res = await request(app)
      .delete(`/api/tasks/${create.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
