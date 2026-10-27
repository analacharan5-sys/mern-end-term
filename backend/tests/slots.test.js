const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const AvailabilitySlot = require('../src/models/AvailabilitySlot');
const {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestService
} = require('./setup');

describe('Service & Slot Discovery and Interval Validation', () => {
  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should reject slot creation when startTime is equal to or after endTime', async () => {
    const { token: adminToken } = await createTestAdmin();
    const service = await createTestService();

    // Start equal to end
    const resEqual = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId: service._id,
        date: '2026-11-05',
        startTime: '10:00',
        endTime: '10:00',
        capacity: 3
      });

    assert.strictEqual(resEqual.status, 400);
    assert.strictEqual(resEqual.body.success, false);
    assert.match(resEqual.body.message, /startTime must be strictly before endTime/i);

    // Start after end
    const resAfter = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId: service._id,
        date: '2026-11-05',
        startTime: '14:30',
        endTime: '14:00',
        capacity: 3
      });

    assert.strictEqual(resAfter.status, 400);
    assert.strictEqual(resAfter.body.success, false);
    assert.match(resAfter.body.message, /startTime must be strictly before endTime/i);
  });

  it('should reject invalid date and time formats', async () => {
    const { token: adminToken } = await createTestAdmin();
    const service = await createTestService();

    // Invalid date format
    const resDate = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId: service._id,
        date: '05-11-2026', // wrong format
        startTime: '09:00',
        endTime: '09:30',
        capacity: 2
      });

    assert.strictEqual(resDate.status, 400);
    assert.match(resDate.body.message, /Invalid date format/i);

    // Invalid time format
    const resTime = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId: service._id,
        date: '2026-11-05',
        startTime: '25:99', // invalid
        endTime: '26:00',
        capacity: 2
      });

    assert.strictEqual(resTime.status, 400);
    assert.match(resTime.body.message, /Invalid time format/i);
  });

  it('should prevent non-admin students from creating slots (403 Forbidden)', async () => {
    const { token: studentToken } = await createTestUser();
    const service = await createTestService();

    const res = await request(app)
      .post('/api/slots')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        serviceId: service._id,
        date: '2026-11-05',
        startTime: '10:00',
        endTime: '10:30',
        capacity: 2
      });

    assert.strictEqual(res.status, 403);
    assert.match(res.body.message, /Forbidden/i);
  });

  it('should generate consecutive non-overlapping slots in bulk for an admin', async () => {
    const { token: adminToken } = await createTestAdmin();
    const service = await createTestService({ durationMinutes: 30, defaultCapacity: 4 });

    const res = await request(app)
      .post('/api/slots/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId: service._id,
        date: '2026-11-10',
        dayStartTime: '09:00',
        dayEndTime: '11:00',
        slotDurationMinutes: 30,
        capacity: 4
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.count, 4); // 09:00, 09:30, 10:00, 10:30
    assert.strictEqual(res.body.slots.length, 4);

    const createdSlots = await AvailabilitySlot.find({ serviceId: service._id, date: '2026-11-10' }).sort({ startTime: 1 });
    assert.strictEqual(createdSlots.length, 4);
    assert.strictEqual(createdSlots[0].startTime, '09:00');
    assert.strictEqual(createdSlots[0].endTime, '09:30');
    assert.strictEqual(createdSlots[3].startTime, '10:30');
    assert.strictEqual(createdSlots[3].endTime, '11:00');
  });

  it('should return error when attempting to fetch slots for an inactive service', async () => {
    const inactiveService = await createTestService({ isActive: false });

    const res = await request(app)
      .get(`/api/slots?serviceId=${inactiveService._id}`);

    assert.strictEqual(res.status, 400);
    assert.match(res.body.message, /service is currently inactive/i);
  });
});
