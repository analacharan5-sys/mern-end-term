process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_key_for_queueless_tests_12345';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../src/models/User');
const Service = require('../src/models/Service');
const AvailabilitySlot = require('../src/models/AvailabilitySlot');
const Appointment = require('../src/models/Appointment');
const jwt = require('jsonwebtoken');

let mongoServer = null;

async function setupDatabase() {
  if (!mongoServer) {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  }
}

async function teardownDatabase() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
}

async function clearDatabase() {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
}

const { getJwtSecret } = require('../src/middleware/auth');

function generateAuthToken(user) {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email, name: user.name },
    getJwtSecret(),
    { expiresIn: '1h' }
  );
}

async function createTestUser(overrides = {}) {
  const timestamp = Date.now();
  const defaultUser = {
    name: 'Test Student',
    email: `student_${timestamp}_${Math.random().toString(36).substring(7)}@campus.edu`,
    password: 'Password123!',
    role: 'student',
    studentId: 'STU-TEST',
    department: 'Engineering'
  };
  const user = await User.create({ ...defaultUser, ...overrides });
  const token = generateAuthToken(user);
  return { user, token };
}

async function createTestAdmin(overrides = {}) {
  return createTestUser({
    name: 'Test Admin',
    role: 'admin',
    ...overrides
  });
}

async function createTestService(overrides = {}) {
  const timestamp = Date.now();
  const defaultService = {
    name: `Test Service ${timestamp}`,
    description: 'A test campus service description',
    category: 'Academic Advising',
    durationMinutes: 30,
    defaultCapacity: 2,
    bufferMinutes: 5,
    location: 'Building A, Room 101',
    isActive: true
  };
  return Service.create({ ...defaultService, ...overrides });
}

async function createTestSlot(serviceId, overrides = {}) {
  const todayStr = '2026-11-01';
  const defaultSlot = {
    serviceId,
    date: todayStr,
    startTime: '09:00',
    endTime: '09:30',
    startDateTime: new Date('2026-11-01T09:00:00Z'),
    endDateTime: new Date('2026-11-01T09:30:00Z'),
    capacity: 2,
    bookedCount: 0,
    isAvailable: true
  };
  return AvailabilitySlot.create({ ...defaultSlot, ...overrides });
}

module.exports = {
  setupDatabase,
  teardownDatabase,
  clearDatabase,
  createTestUser,
  createTestAdmin,
  createTestService,
  createTestSlot,
  generateAuthToken
};
