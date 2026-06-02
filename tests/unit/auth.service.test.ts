import bcrypt from 'bcryptjs';
import { authService } from '../../src/services/auth.service';
import { User } from '../../src/models/user.model';
import { ChildProfile } from '../../src/models/childProfile.model';
import { AppError } from '../../src/middlewares/errorHandler.middleware';

jest.mock('../../src/models/user.model', () => ({
  User: { findOne: jest.fn(), create: jest.fn() },
}));
jest.mock('../../src/models/childProfile.model', () => ({
  ChildProfile: { create: jest.fn() },
}));

const MockUser = User as unknown as { findOne: jest.Mock; create: jest.Mock };
const MockChildProfile = ChildProfile as unknown as { create: jest.Mock };

const fakeAdmin = {
  id: 1,
  familyId: 'family-uuid',
  username: 'admin',
  email: 'admin@test.com',
  role: 'admin' as const,
  isActive: true,
  passwordHash: 'hashed',
};
const fakeChild = {
  id: 2,
  familyId: 'family-uuid',
  username: 'kid1',
  email: null,
  role: 'child' as const,
  isActive: true,
  passwordHash: 'hashed',
};

beforeEach(() => jest.clearAllMocks());

describe('authService.registerAdmin', () => {
  it('creates user and returns a valid JWT', async () => {
    MockUser.findOne.mockResolvedValue(null);
    MockUser.create.mockResolvedValue(fakeAdmin);
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

    const token = await authService.registerAdmin({
      email: 'admin@test.com',
      password: 'Password1',
      username: 'admin',
    });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
    expect(MockUser.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'admin@test.com', role: 'admin' })
    );
  });

  it('throws 409 when email already exists', async () => {
    MockUser.findOne.mockResolvedValue(fakeAdmin);

    await expect(
      authService.registerAdmin({ email: 'admin@test.com', password: 'Password1', username: 'admin' })
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('authService.createChild', () => {
  it('creates user + ChildProfile and returns object without passwordHash', async () => {
    MockUser.findOne.mockResolvedValue(null);
    MockUser.create.mockResolvedValue(fakeChild);
    MockChildProfile.create.mockResolvedValue({
      userId: 2,
      displayName: 'Kid One',
      avatarColor: '#FF0000',
    });
    jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed' as never);

    const result = await authService.createChild(
      { username: 'kid1', password: 'pass', displayName: 'Kid One', avatarColor: '#FF0000' },
      'family-uuid'
    );

    expect(result).not.toHaveProperty('passwordHash');
    expect(result).toMatchObject({ username: 'kid1', displayName: 'Kid One' });
    expect(MockChildProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 2, displayName: 'Kid One' })
    );
  });

  it('throws 409 when username already exists in family', async () => {
    MockUser.findOne.mockResolvedValue(fakeChild);

    await expect(
      authService.createChild({ username: 'kid1', password: 'pass', displayName: 'Kid' }, 'family-uuid')
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe('authService.login', () => {
  it('returns JWT for valid admin credentials (email)', async () => {
    MockUser.findOne.mockResolvedValueOnce(fakeAdmin);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const token = await authService.login({ identifier: 'admin@test.com', password: 'Password1' });

    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('returns JWT for valid child credentials (username)', async () => {
    // email search returns null, username search returns child
    MockUser.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fakeChild);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

    const token = await authService.login({ identifier: 'kid1', password: 'pass' });

    expect(typeof token).toBe('string');
  });

  it('throws 401 for wrong password', async () => {
    MockUser.findOne.mockResolvedValueOnce(fakeAdmin);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(
      authService.login({ identifier: 'admin@test.com', password: 'wrong' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when user not found', async () => {
    MockUser.findOne.mockResolvedValue(null);

    await expect(
      authService.login({ identifier: 'nobody@test.com', password: 'pass' })
    ).rejects.toMatchObject({ status: 401 });
  });

  it('throws 401 when user is inactive', async () => {
    MockUser.findOne.mockResolvedValueOnce({ ...fakeAdmin, isActive: false });

    await expect(
      authService.login({ identifier: 'admin@test.com', password: 'pass' })
    ).rejects.toBeInstanceOf(AppError);
  });
});
