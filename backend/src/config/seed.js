const User = require('../models/User');
const Service = require('../models/Service');
const AvailabilitySlot = require('../models/AvailabilitySlot');

const defaultSampleHours = [
  { start: '09:00', end: '09:30' },
  { start: '09:30', end: '10:00' },
  { start: '10:00', end: '10:30' },
  { start: '10:30', end: '11:00' },
  { start: '11:00', end: '11:30' },
  { start: '13:00', end: '13:30' },
  { start: '13:30', end: '14:00' },
  { start: '14:00', end: '14:30' },
  { start: '14:30', end: '15:00' },
  { start: '15:00', end: '15:30' }
];

async function seedUpcomingSlots(daysAhead = 7) {
  try {
    const activeServices = await Service.find({ isActive: true });
    if (activeServices.length === 0) return;

    const today = new Date();
    const slotsToInsert = [];

    for (let offset = 0; offset <= daysAhead; offset++) {
      const targetDate = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000);
      const dateStr = targetDate.toISOString().split('T')[0];
      const [y, m, d] = dateStr.split('-').map(Number);

      for (const service of activeServices) {
        const existingCount = await AvailabilitySlot.countDocuments({
          serviceId: service._id,
          date: dateStr
        });

        if (existingCount === 0) {
          for (const slot of defaultSampleHours) {
            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);

            slotsToInsert.push({
              serviceId: service._id,
              date: dateStr,
              startTime: slot.start,
              endTime: slot.end,
              startDateTime: new Date(Date.UTC(y, m - 1, d, sH, sM)),
              endDateTime: new Date(Date.UTC(y, m - 1, d, eH, eM)),
              capacity: service.defaultCapacity || 3,
              bookedCount: 0,
              isAvailable: true
            });
          }
        }
      }
    }

    if (slotsToInsert.length > 0) {
      await AvailabilitySlot.insertMany(slotsToInsert, { ordered: false });
      console.log(`[Seed] Automatically ensured ${slotsToInsert.length} availability slots across active services for the next ${daysAhead} days.`);
    }
  } catch (err) {
    console.warn('[Seed Warning] Non-critical error while seeding upcoming slots:', err.message);
  }
}

async function seedInitialData() {
  try {
    // 1. Seed default Admin if no admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'Campus Administrator',
        email: 'admin@campus.edu',
        password: 'AdminPass123!',
        role: 'admin',
        department: 'Academic Affairs & Student Services'
      });
      console.log('[Seed] Created default administrator: admin@campus.edu / AdminPass123!');
    }

    // 2. Seed default Student if no student exists
    const studentExists = await User.findOne({ email: 'student@campus.edu' });
    if (!studentExists) {
      await User.create({
        name: 'Alex Morgan',
        email: 'student@campus.edu',
        password: 'StudentPass123!',
        role: 'student',
        studentId: 'STU-2026-8891',
        department: 'Computer Science'
      });
      console.log('[Seed] Created default student: student@campus.edu / StudentPass123!');
    }

    // 3. Seed default Services if empty
    const serviceCount = await Service.countDocuments();
    if (serviceCount === 0) {
      const defaultServices = [
        {
          name: 'Academic Advising',
          description: 'Degree planning, course prerequisites, graduation checks, and academic counseling.',
          category: 'Academic Advising',
          durationMinutes: 30,
          defaultCapacity: 2,
          bufferMinutes: 5,
          location: 'Hall Hall, Room 204',
          contactEmail: 'advising@campus.edu',
          isActive: true
        },
        {
          name: 'Financial Aid & Scholarships',
          description: 'FAFSA guidance, scholarship disbursement, work-study programs, and emergency grants.',
          category: 'Financial Aid',
          durationMinutes: 20,
          defaultCapacity: 3,
          bufferMinutes: 5,
          location: 'Student Union, Ground Floor Counter 3',
          contactEmail: 'finaid@campus.edu',
          isActive: true
        },
        {
          name: 'Campus Health & Wellness',
          description: 'Routine medical consultations, immunizations, mental wellness triage, and prescriptions.',
          category: 'Campus Health',
          durationMinutes: 25,
          defaultCapacity: 2,
          bufferMinutes: 10,
          location: 'Health & Wellness Pavilion',
          contactEmail: 'healthcenter@campus.edu',
          isActive: true
        },
        {
          name: 'Registrar & Student Records',
          description: 'Official transcript requests, enrollment verification, degree certificates, and name updates.',
          category: 'Registrar & Records',
          durationMinutes: 15,
          defaultCapacity: 4,
          bufferMinutes: 5,
          location: 'Administration Tower, 1st Floor',
          contactEmail: 'registrar@campus.edu',
          isActive: true
        },
        {
          name: 'Career Center & Resume Review',
          description: 'Resume critiques, mock interviews, internship postings, and career transition coaching.',
          category: 'Career Services',
          durationMinutes: 45,
          defaultCapacity: 1,
          bufferMinutes: 15,
          location: 'Student Success Center, Room 310',
          contactEmail: 'careers@campus.edu',
          isActive: true
        }
      ];

      const createdServices = await Service.insertMany(defaultServices);
      console.log(`[Seed] Created ${createdServices.length} default campus services.`);
    }

    // 4. Ensure upcoming availability slots exist for active services (rolling 7 days)
    await seedUpcomingSlots(7);
  } catch (err) {
    console.warn('[Seed Warning] Seeding skipped or encountered non-critical error:', err.message);
  }
}

module.exports = { seedInitialData, seedUpcomingSlots, defaultSampleHours };
