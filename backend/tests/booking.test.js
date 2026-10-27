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
  createTestService,
  createTestSlot
} = require('./setup');

describe('Appointment Booking & Concurrency Handling', () => {
  before(async () => {
    await setupDatabase();
  });

  after(async () => {
    await teardownDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  it('should reserve an available slot and assign a sequential queue ticket', async () => {
    const { user, token } = await createTestUser();
    const service = await createTestService();
    const slot = await createTestSlot(service._id, { capacity: 3 });

    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        slotId: slot._id,
        reason: 'Discuss major requirements'
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.appointment.status, 'booked');
    assert.strictEqual(res.body.appointment.queueNumber, 1);
    assert.strictEqual(res.body.appointment.reason, 'Discuss major requirements');

    // Verify slot bookedCount incremented
    const updatedSlot = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(updatedSlot.bookedCount, 1);
  });

  it('should reject duplicate active bookings for the same slot by the same student', async () => {
    const { user, token } = await createTestUser();
    const service = await createTestService();
    const slot = await createTestSlot(service._id, { capacity: 5 });

    // First booking succeeds
    const firstRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: slot._id });
    assert.strictEqual(firstRes.status, 201);

    // Second booking attempt by the same student must be rejected
    const secondRes = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ slotId: slot._id });

    assert.strictEqual(secondRes.status, 409);
    assert.strictEqual(secondRes.body.success, false);
    assert.match(secondRes.body.message, /already have an active appointment booked for this time slot/i);

    // Verify bookedCount is still 1
    const updatedSlot = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(updatedSlot.bookedCount, 1);
  });

  it('should enforce capacity limits and reject bookings once slot capacity is reached', async () => {
    const service = await createTestService();
    // Slot with capacity = 2
    const slot = await createTestSlot(service._id, { capacity: 2 });

    const student1 = await createTestUser({ email: 's1@campus.edu' });
    const student2 = await createTestUser({ email: 's2@campus.edu' });
    const student3 = await createTestUser({ email: 's3@campus.edu' });

    // 1st booking
    const res1 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student1.token}`)
      .send({ slotId: slot._id });
    assert.strictEqual(res1.status, 201);
    assert.strictEqual(res1.body.appointment.queueNumber, 1);

    // 2nd booking
    const res2 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student2.token}`)
      .send({ slotId: slot._id });
    assert.strictEqual(res2.status, 201);
    assert.strictEqual(res2.body.appointment.queueNumber, 2);

    // 3rd booking must fail with 409
    const res3 = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${student3.token}`)
      .send({ slotId: slot._id });

    assert.strictEqual(res3.status, 409);
    assert.strictEqual(res3.body.success, false);
    assert.match(res3.body.message, /Slot capacity reached/i);

    // Verify slot bookedCount remained strictly at capacity = 2
    const checkSlot = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(checkSlot.bookedCount, 2);
  });

  it('should handle concurrent reservation requests without exceeding capacity', async () => {
    const service = await createTestService();
    const capacityLimit = 3;
    const slot = await createTestSlot(service._id, { capacity: capacityLimit });

    // Create 8 distinct students attempting to book the 3-capacity slot simultaneously
    const totalConcurrentStudents = 8;
    const studentPromises = [];
    for (let i = 0; i < totalConcurrentStudents; i++) {
      studentPromises.push(createTestUser({ email: `concurrent_${i}_${Date.now()}@campus.edu` }));
    }
    const students = await Promise.all(studentPromises);

    // Execute concurrent booking requests in parallel
    const bookingRequests = students.map((student) =>
      request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${student.token}`)
        .send({ slotId: slot._id })
    );

    const results = await Promise.all(bookingRequests);

    const successfulBookings = results.filter((r) => r.status === 201);
    const rejectedBookings = results.filter((r) => r.status === 409);

    // Exactly capacityLimit requests must succeed
    assert.strictEqual(successfulBookings.length, capacityLimit);
    // The remaining requests must be rejected with 409
    assert.strictEqual(rejectedBookings.length, totalConcurrentStudents - capacityLimit);

    // Database verification: Slot bookedCount strictly equals capacityLimit
    const finalSlot = await AvailabilitySlot.findById(slot._id);
    assert.strictEqual(finalSlot.bookedCount, capacityLimit);

    // Database verification: Exactly 3 appointment records exist for this slot
    const appointmentRecords = await Appointment.find({ slotId: slot._id });
    assert.strictEqual(appointmentRecords.length, capacityLimit);

    // All successful bookings must have distinct, sequential queue numbers
    const queueNumbers = appointmentRecords.map((a) => a.queueNumber).sort((a, b) => a - b);
    assert.deepStrictEqual(queueNumbers, [1, 2, 3]);
  });
});
