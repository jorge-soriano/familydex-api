import request from 'supertest';
import app from '../../src/app';
import { sequelize } from '../../src/models';

beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

// ─── Register ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  it('201 and JWT on valid registration', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'admin@test.com',
      username: 'admin1',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
  });

  it('409 when email already exists', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'admin@test.com',
      username: 'admin2',
      password: 'Password1',
      confirmPassword: 'Password1',
    });
    expect(res.status).toBe(409);
  });

  it('400 when passwords do not match', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'other@test.com',
      username: 'admin3',
      password: 'Password1',
      confirmPassword: 'Different1',
    });
    expect(res.status).toBe(400);
  });

  it('400 when password too weak', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'weak@test.com',
      username: 'admin4',
      password: 'password',
      confirmPassword: 'password',
    });
    expect(res.status).toBe(400);
  });
});

// ─── Login ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  it('200 and JWT for valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Password1' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  it('401 for wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@test.com', password: 'WrongPass1' });
    expect(res.status).toBe(401);
  });

  it('401 for unknown user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'nobody@test.com', password: 'Password1' });
    expect(res.status).toBe(401);
  });
});

// ─── Create child ─────────────────────────────────────────────────────────────

describe('POST /api/auth/children', () => {
  let adminToken: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Password1' });
    adminToken = res.body.token;
  });

  it('201 and child object without passwordHash', async () => {
    const res = await request(app)
      .post('/api/auth/children')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'kid1', password: 'pass123', displayName: 'Kid One', avatarColor: '#FF0000' });
    expect(res.status).toBe(201);
    expect(res.body).not.toHaveProperty('passwordHash');
    expect(res.body).toMatchObject({ username: 'kid1', displayName: 'Kid One' });
  });

  it('409 when username already exists in family', async () => {
    const res = await request(app)
      .post('/api/auth/children')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'kid1', password: 'pass123', displayName: 'Kid Again' });
    expect(res.status).toBe(409);
  });

  it('401 without token', async () => {
    const res = await request(app)
      .post('/api/auth/children')
      .send({ username: 'kid2', password: 'pass123', displayName: 'Kid Two' });
    expect(res.status).toBe(401);
  });

  it('403 when called by a child', async () => {
    // Login as child
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'kid1', password: 'pass123' });
    const childToken = loginRes.body.token;

    const res = await request(app)
      .post('/api/auth/children')
      .set('Authorization', `Bearer ${childToken}`)
      .send({ username: 'kid2', password: 'pass123', displayName: 'Kid Two' });
    expect(res.status).toBe(403);
  });

  it('child login works with username', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'kid1', password: 'pass123' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');

    const payload = JSON.parse(
      Buffer.from(res.body.token.split('.')[1], 'base64').toString()
    );
    expect(payload.role).toBe('child');
  });
});

// ─── Logout ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('200 with valid token', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ identifier: 'admin@test.com', password: 'Password1' });

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(res.status).toBe(200);
  });

  it('401 without token', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
