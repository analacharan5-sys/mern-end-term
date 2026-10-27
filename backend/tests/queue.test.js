const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const Appointment = require('../src/models/Appointment');
const {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestService,
  createTestSlot
} = require('./setup');

describe('Queue Management & State Transitions', () => {
  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should support valid state transitions: booked -> checked_in -> completed', async () => {
    const service = await createTestService({ durationMinutes: 20 });
    const slot = await createTestSlot(service._id, { capacity: 3 });
    const student = await createTestUser();
    const admin = await createTestAdmin();

    // 1. Initial State: booked
    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ slotId: slot._id });

    assert.strictEqual(bookRes.status, 201);
    const appointmentId = bookRes.body.appointment._id;
    assert.strictEqual(bookRes.body.appointment.status, 'booked');

    // 2. Transition: booked -> checked_in (student arrives and checks in)
    const checkInRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${student.token}`);

    assert.strictEqual(checkInRes.status, 200);
    assert.strictEqual(checkInRes.body.appointment.status, 'checked_in');
    assert.ok(checkInRes.body.appointment.checkedInAt);

    // 3. Transition: checked_in -> completed (admin/staff completes the consultation)
    const completeRes = await request(app)
      .patch(`/api/admin/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        status: 'completed',
        notes: 'Consultation finished successfully.'
      });

    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.body.appointment.status, 'completed');
    assert.ok(completeRes.body.appointment.completedAt);
    assert.strictEqual(completeRes.body.appointment.notes, 'Consultation finished successfully.');
  });

  it('should reject invalid state transitions (e.g. completed -> booked, cancelled -> checked_in)', async () => {
    const service = await createTestService();
    const slot = await createTestSlot(service._id, { capacity: 2 });
    const student = await createTestUser();
    const admin = await createTestAdmin();

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ slotId: slot._id });
    const appointmentId = bookRes.body.appointment._id;

    // Cancel the appointment
    await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${student.token}`);

    // Try invalid transition: cancelled -> checked_in
    const invalidCheckIn = await request(app)
      .patch(`/api/appointments/${appointmentId}/check-in`)
      .set('Authorization', `Bearer ${student.token}`);

    assert.strictEqual(invalidCheckIn.status, 400);
    assert.match(invalidCheckIn.body.message, /Cannot check in/i);

    // Try invalid transition via admin: cancelled -> booked
    const invalidAdminTransition = await request(app)
      .patch(`/api/admin/appointments/${appointmentId}/status`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ status: 'booked' });

    assert.strictEqual(invalidAdminTransition.status, 400);
    assert.match(invalidAdminTransition.body.message, /Cannot modify an appointment that is already cancelled/i);
  });

  it('should dynamically maintain and recalculate queue positions when an earlier appointment is cancelled', async () => {
    const service = await createTestService({ durationMinutes: 15 });
    const slot = await createTestSlot(service._id, { capacity: 4 });

    const student1 = await createTestUser({ email: 'first@campus.edu' });
    const student2 = await createTestUser({ email: 'second@campus.edu' });
    const student3 = await createTestUser({ email: 'third@campus.edu' });

    // 1. Student 1 books (queue ticket #1)
    const res1 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student1.token}`)
      .send({ slotId: slot._id });
    const apt1Id = res1.body.appointment._id;

    // 2. Student 2 books (queue ticket #2)
    const res2 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student2.token}`)
      .send({ slotId: slot._id });
    const apt2Id = res2.body.appointment._id;

    // 3. Student 3 books (queue ticket #3)
    const res3 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student3.token}`)
      .send({ slotId: slot._id });
    const apt3Id = res3.body.appointment._id;

    // Initial check for Student 2: should be position 2 (1 ahead)
    let status2 = await request(app)
      .get(`/api/queue/appointment/${apt2Id}`)
      .set('Authorization', `Bearer ${student2.token}`);

    assert.strictEqual(status2.status, 200);
    assert.strictEqual(status2.body.queue.positionInLine, 2);
    assert.strictEqual(status2.body.queue.aheadCount, 1);
    assert.strictEqual(status2.body.queue.estimatedWaitMinutes, 15);

    // Initial check for Student 3: should be position 3 (2 ahead)
    let status3 = await request(app)
      .get(`/api/queue/appointment/${apt3Id}`)
      .set('Authorization', `Bearer ${student3.token}`);

    assert.strictEqual(status3.status, 200);
    assert.strictEqual(status3.body.queue.positionInLine, 3);
    assert.strictEqual(status3.body.queue.aheadCount, 2);
    assert.strictEqual(status3.body.queue.estimatedWaitMinutes, 30);

    // NOW Student 1 cancels their appointment
    const cancelRes = await request(app)
      .patch(`/api/appointments/${apt1Id}/cancel`)
      .set('Authorization', `Bearer ${student1.token}`);
    assert.strictEqual(cancelRes.status, 200);

    // VERIFY RECALCULATION:
    // Student 2 is now automatically FIRST in line (position 1, 0 ahead, 0 wait)!
    status2 = await request(app)
      .get(`/api/queue/appointment/${apt2Id}`)
      .set('Authorization', `Bearer ${student2.token}`);

    assert.strictEqual(status2.body.queue.positionInLine, 1);
    assert.strictEqual(status2.body.queue.aheadCount, 0);
    assert.strictEqual(status2.body.queue.estimatedWaitMinutes, 0);

    // Student 3 is now automatically SECOND in line (position 2, 1 ahead, 15 wait)!
    status3 = await request(app)
      .get(`/api/queue/appointment/${apt3Id}`)
      .set('Authorization', `Bearer ${student3.token}`);

    assert.strictEqual(status3.body.queue.positionInLine, 2);
    assert.strictEqual(status3.body.queue.aheadCount, 1);
    assert.strictEqual(status3.body.queue.estimatedWaitMinutes, 15);
  });
});
