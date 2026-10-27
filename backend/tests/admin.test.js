const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestService,
  createTestSlot
} = require('./setup');

describe('Administrative Operations, Role Authorization & Analytics Reporting', () => {
  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should strictly reject unauthorized student requests to all administrative endpoints (403 Forbidden)', async () => {
    const student = await createTestUser();

    // 1. Service Creation
    const resSvc = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ name: 'Hacked Service', description: 'Desc' });
    assert.strictEqual(resSvc.status, 403);

    // 2. Slot Bulk Generator
    const resGen = await request(app)
      .post('/api/slots/generate')
      .set('Authorization', `Bearer ${student.token}`)
      .send({});
    assert.strictEqual(resGen.status, 403);

    // 3. Admin Appointments List
    const resApts = await request(app)
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${student.token}`);
    assert.strictEqual(resApts.status, 403);

    // 4. Admin Analytics Stats
    const resStats = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${student.token}`);
    assert.strictEqual(resStats.status, 403);

    // 5. Unauthenticated request to admin endpoints -> 401 Unauthorized
    const resUnauth = await request(app).get('/api/admin/stats');
    assert.strictEqual(resUnauth.status, 401);
  });

  it('should accurately calculate utilization rates and appointment status counts from persisted records', async () => {
    const admin = await createTestAdmin();
    const service = await createTestService({ name: 'Advising Center' });

    // Create 2 slots with capacity 2 each = Total capacity 4
    const slot1 = await createTestSlot(service._id, { date: '2026-11-20', startTime: '09:00', endTime: '09:30', capacity: 2 });
    const slot2 = await createTestSlot(service._id, { date: '2026-11-20', startTime: '10:00', endTime: '10:30', capacity: 2 });

    const student1 = await createTestUser({ email: 'stu1@campus.edu' });
    const student2 = await createTestUser({ email: 'stu2@campus.edu' });
    const student3 = await createTestUser({ email: 'stu3@campus.edu' });

    // Student 1 books slot 1 and checks in
    const res1 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student1.token}`)
      .send({ slotId: slot1._id });
    await request(app)
      .patch(`/api/appointments/${res1.body.appointment._id}/check-in`)
      .set('Authorization', `Bearer ${student1.token}`);

    // Student 2 books slot 1, checks in, and is marked completed by staff
    const res2 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student2.token}`)
      .send({ slotId: slot1._id });
    await request(app)
      .patch(`/api/appointments/${res2.body.appointment._id}/check-in`)
      .set('Authorization', `Bearer ${student2.token}`);
    await request(app)
      .patch(`/api/admin/appointments/${res2.body.appointment._id}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'completed' });

    // Student 3 books slot 2, then cancels
    const res3 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student3.token}`)
      .send({ slotId: slot2._id });
    await request(app)
      .patch(`/api/appointments/${res3.body.appointment._id}/cancel`)
      .set('Authorization', `Bearer ${student3.token}`);

    // Call Admin Stats
    const statsRes = await request(app)
      .get('/api/admin/stats?startDate=2026-11-20&endDate=2026-11-20')
      .set('Authorization', `Bearer ${admin.token}`);

    assert.strictEqual(statsRes.status, 200);
    const summary = statsRes.body.summary;

    assert.strictEqual(summary.totalSlots, 2);
    assert.strictEqual(summary.totalCapacity, 4);
    assert.strictEqual(summary.totalAppointments, 3);
    assert.strictEqual(summary.statusCounts.checked_in, 1);
    assert.strictEqual(summary.statusCounts.completed, 1);
    assert.strictEqual(summary.statusCounts.cancelled, 1);
    assert.strictEqual(summary.statusCounts.booked, 0);

    // Active or served seats = 1 (checked_in) + 1 (completed) = 2
    // Utilization rate = (2 / 4) * 100 = 50.0%
    assert.strictEqual(summary.utilizationRate, 50);

    // Completion rate = (1 / 3) * 100 = 33.3%
    assert.strictEqual(summary.completionRate, 33.3);

    // Cancellation rate = (1 / 3) * 100 = 33.3%
    assert.strictEqual(summary.cancellationRate, 33.3);

    // Service Breakdown check
    const breakdown = statsRes.body.serviceBreakdown;
    assert.strictEqual(breakdown.length, 1);
    assert.strictEqual(breakdown[0].name, 'Advising Center');
    assert.strictEqual(breakdown[0].totalAppointments, 3);
    assert.strictEqual(breakdown[0].utilizationRate, 50);
  });

  it('should return meaningful empty state metrics when no records match date filters', async () => {
    const admin = await createTestAdmin();

    const statsRes = await request(app)
      .get('/api/admin/stats?startDate=2099-01-01&endDate=2099-01-31')
      .set('Authorization', `Bearer ${admin.token}`);

    assert.strictEqual(statsRes.status, 200);
    const summary = statsRes.body.summary;
    assert.strictEqual(summary.totalSlots, 0);
    assert.strictEqual(summary.totalCapacity, 0);
    assert.strictEqual(summary.totalAppointments, 0);
    assert.strictEqual(summary.utilizationRate, 0);
  });
});
