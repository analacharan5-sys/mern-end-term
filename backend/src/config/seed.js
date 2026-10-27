const User = require('./models/User');
const Service = require('./models/Service');
const AvailabilitySlot = require('./models/AvailabilitySlot');

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

      // Seed sample availability slots for today and tomorrow
      const today = new Date();
      const datesToSeed = [
        today.toISOString().split('T')[0],
        new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      ];

      const sampleHours = [
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

      for (const service of createdServices) {
        for (const dateStr of datesToSeed) {
          const slotsToInsert = sampleHours.map((slot) => {
            const [sH, sM] = slot.start.split(':').map(Number);
            const [eH, eM] = slot.end.split(':').map(Number);
            const [y, m, d] = dateStr.split('-').map(Number);

            return {
              serviceId: service._id,
              date: dateStr,
              startTime: slot.start,
              endTime: slot.end,
              startDateTime: new Date(Date.UTC(y, m - 1, d, sH, sM)),
              endDateTime: new Date(Date.UTC(y, m - 1, d, eH, eM)),
              capacity: service.defaultCapacity,
              bookedCount: 0,
              isAvailable: true
            };
          });

          await AvailabilitySlot.insertMany(slotsToInsert);
        }
      }
      console.log('[Seed] Generated default availability slots for campus services.');
    }
  } catch (err) {
    console.warn('[Seed Warning] Seeding skipped or encountered non-critical error:', err.message);
  }
}

module.exports = { seedInitialData };
