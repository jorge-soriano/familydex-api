// Integration tests implemented in Épica 1
// Uses Supertest against a real test database (DB_TEST_NAME)
describe('POST /api/auth/register', () => {
  it.todo('returns 201 and JWT on valid registration');
  it.todo('returns 409 when email already exists');
});

describe('POST /api/auth/login', () => {
  it.todo('returns 200 and JWT for valid credentials');
  it.todo('returns 401 for invalid credentials');
});
