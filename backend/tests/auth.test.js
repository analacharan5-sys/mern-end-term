const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createTestUser,
  createTestAdmin
} = require('./setup');

describe('Authentication & Role Permissions', () => {
  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should register a new student user with hashed password and return HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Jane Doe',
        email: 'jane.doe@campus.edu',
        password: 'SecurePassword123!',
        studentId: 'STU-9901',
        department: 'Biology'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.user.name, 'Jane Doe');
    assert.strictEqual(res.body.user.email, 'jane.doe@campus.edu');
    assert.strictEqual(res.body.user.role, 'student');
    assert.strictEqual(res.body.user.password, undefined);

    // Verify cookie was set with HttpOnly
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Cookie should be returned');
    const jwtCookie = cookies.find((c) => c.startsWith('jwt='));
    assert.ok(jwtCookie, 'jwt cookie must be present');
    assert.ok(jwtCookie.includes('HttpOnly'), 'jwt cookie must be HttpOnly');

    // Verify password is encrypted in database
    const dbUser = await User.findOne({ email: 'jane.doe@campus.edu' }).select('+password');
    assert.notStrictEqual(dbUser.password, 'SecurePassword123!');
    const isMatch = await dbUser.comparePassword('SecurePassword123!');
    assert.strictEqual(isMatch, true);
  });

  it('should reject registration with a duplicate email address', async () => {
    await createTestUser({ email: 'existing@campus.edu' });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Another User',
        email: 'existing@campus.edu',
        password: 'Password123!'
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /already exists/i);
  });

  it('should successfully log in with valid credentials and reject invalid credentials', async () => {
    await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Login Test',
        email: 'login@campus.edu',
        password: 'CorrectPassword123!'
      });

    // Valid login
    const validRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@campus.edu',
        password: 'CorrectPassword123!'
      });

    assert.strictEqual(validRes.status, 200);
    assert.strictEqual(validRes.body.success, true);
    assert.ok(validRes.headers['set-cookie']);

    // Invalid login
    const invalidRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'login@campus.edu',
        password: 'WrongPassword'
      });

    assert.strictEqual(invalidRes.status, 401);
    assert.strictEqual(invalidRes.body.success, false);
    assert.match(invalidRes.body.message, /Invalid email or password/i);
  });

  it('should clear JWT cookie on logout', async () => {
    const res = await request(app).post('/api/auth/logout');
    assert.strictEqual(res.status, 200);
    const cookies = res.headers['set-cookie'];
    const jwtCookie = cookies.find((c) => c.startsWith('jwt='));
    assert.ok(jwtCookie.includes('Expires=') || jwtCookie.includes('Max-Age=0'));
  });

  it('should access /api/auth/me when authenticated via Bearer token or cookie', async () => {
    const { user, token } = await createTestUser({ name: 'Sam Student' });

    // With Bearer token
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.name, 'Sam Student');
    assert.strictEqual(res.body.user.role, 'student');

    // Without token should return 401 Unauthorized
    const unauthRes = await request(app).get('/api/auth/me');
    assert.strictEqual(unauthRes.status, 401);
  });

  it('should enforce CSRF token on cookie-authenticated state-changing requests', async () => {
    const { user, token } = await createTestUser();
    const csrfSecret = 'sample_csrf_token_value_xyz';

    // Request with JWT cookie but WITHOUT matching x-csrf-token header should be rejected (403)
    const blockedRes = await request(app)
      .post('/api/appointments')
      .set('Cookie', [`jwt=${token}`, `XSRF-TOKEN=${csrfSecret}`])
      .send({ slotId: '507f1f77bcf86cd799439011' });

    assert.strictEqual(blockedRes.status, 403);
    assert.match(blockedRes.body.message, /CSRF token/i);

    // Request with JWT cookie AND matching x-csrf-token header passes CSRF verification
    const allowedRes = await request(app)
      .post('/api/appointments')
      .set('Cookie', [`jwt=${token}`, `XSRF-TOKEN=${csrfSecret}`])
      .set('x-csrf-token', csrfSecret)
      .send({ slotId: '507f1f77bcf86cd799439011' });

    // Fails with 404 (slot not found) rather than 403 CSRF mismatch
    assert.strictEqual(allowedRes.status, 404);
  });
});
