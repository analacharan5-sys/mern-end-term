const { describe, it, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const app = require('../src/app');
const AvailabilitySlot = require('../src/models/AvailabilitySlot');
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

describe('Cancellation & Availability Capacity Updates', () => {
  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should restore slot capacity upon cancellation and allow a new student to book', async () => {
    const service = await createTestService();
    // Slot with capacity = 1
    const slot = await createTestSlot(service._id, { capacity: 1 });

    const studentA = await createTestUser({ email: 'studentA@campus.edu' });
    const studentB = await createTestUser({ email: 'studentB@campus.edu' });

    // Student A books the slot
    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({ slotId: slot._id });

    assert.strictEqual(bookRes.status, 201);
    const appointmentId = bookRes.body.appointment._id;

    // Slot is now full
    let slotCheck = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(slotCheck.bookedCount, 1);

    // Student B attempts to book full slot -> rejected 409
    const blockedRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ slotId: slot._id });
    assert.strictEqual(blockedRes.status, 409);

    // Student A cancels their appointment
    const cancelRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${studentA.token}`)
      .send({ reason: 'Schedule conflict' });

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.success, true);
    assert.strictEqual(cancelRes.body.appointment.status, 'cancelled');

    // Slot capacity is restored! (bookedCount is back to 0)
    slotCheck = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(slotCheck.bookedCount, 0);

    // Student B can now successfully book the slot!
    const successRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${studentB.token}`)
      .send({ slotId: slot._id });

    assert.strictEqual(successRes.status, 201);
    slotCheck = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(slotCheck.bookedCount, 1);
  });

  it('should prevent students from cancelling appointments they do not own (403 Forbidden)', async () => {
    const service = await createTestService();
    const slot = await createTestSlot(service._id, { capacity: 2 });

    const owner = await createTestUser({ email: 'owner@campus.edu' });
    const attacker = await createTestUser({ email: 'attacker@campus.edu' });

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${owner.token}`)
      .send({ slotId: slot._id });

    const appointmentId = bookRes.body.appointment._id;

    // Attacker attempts to cancel owner's appointment
    const res = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${attacker.token}`)
      .send({ reason: 'Malicious cancellation' });

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.success, false);
    assert.match(res.body.message, /Forbidden/i);

    // Verify appointment status is still 'booked'
    const apt = await Appointment.findById(appointmentId);
    assert.strictEqual(apt.status, 'booked');
  });

  it('should allow administrators to cancel any student appointment', async () => {
    const service = await createTestService();
    const slot = await createTestSlot(service._id, { capacity: 2 });

    const student = await createTestUser();
    const { token: adminToken } = await createTestAdmin();

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student.token}`)
      .send({ slotId: slot._id });

    const appointmentId = bookRes.body.appointment._id;

    // Admin cancels
    const cancelRes = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Emergency maintenance closure' });

    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelRes.body.appointment.status, 'cancelled');
  });

  it('should reject cancelling an already completed or cancelled appointment', async () => {
    const service = await createTestService();
    const slot = await createTestSlot(service._id, { capacity: 2 });
    const { user, token } = await createTestUser();

    const bookRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: slot._id });

    const appointmentId = bookRes.body.appointment._id;

    // First cancel
    await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    // Second cancel attempt
    const secondCancel = await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(secondCancel.status, 400);
    assert.match(secondCancel.body.message, /already cancelled/i);
  });
});
