const { User, ROLES } = require('./models/User');
const Student = require('./models/Student');
const Class = require('./models/Class');
const StudentClass = require('./models/StudentClass');
const StudentParent = require('./models/StudentParent');

/**
 * Inserts sample data for development/testing if not present
 * @returns {Promise<void>}
 */
async function initSampleData() {
  try {
    // Define default users
    const defaultUsers = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        phone: '1234567890',
        password: 'admin123',
        role: ROLES.ADMIN
      },
      {
        name: 'Teacher User',
        email: 'teacher@example.com',
        phone: '2345678901',
        password: 'teacher123',
        role: ROLES.TEACHER
      },
      {
        name: 'Parent User',
        email: 'parent@example.com',
        phone: '3456789012',
        password: 'parent123',
        role: ROLES.PARENT
      }
    ];

    // Create each default user if they don't already exist
    for (const userData of defaultUsers) {
      // Check if user already exists
      const existingUser = await User.findByEmail(userData.email);
      
      if (!existingUser) {
        console.log(`Creating default ${userData.role} user...`);
        await User.create(userData);
        console.log(`Default ${userData.role} user created successfully`);
        console.log(`Email: ${userData.email}`);
        console.log(`Password: ${userData.password}`);
        console.log(`Role: ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}`);
      } else {
        console.log(`Default ${userData.role} user already exists`);
      }
    }

    // Example students
    const students = [
      {
        name: 'Student One',
        email: 'student1@example.com',
        dateOfBirth: '2010-01-01'
      },
      {
        name: 'Student Two',
        email: 'student2@example.com',
        dateOfBirth: '2011-02-02'
      }
    ];
    for (const studentData of students) {
      const existing = await Student.findById(studentData.email);
      if (!existing) {
        console.log(`Creating example student: ${studentData.name}`);
        await Student.create(studentData);
      }
    }

    // Example classes
    const classes = [
      { name: 'Math 101', description: 'Basic Math Class' },
      { name: 'Science 101', description: 'Basic Science Class' }
    ];
    for (const classData of classes) {
      const existing = (await Class.findAll()).find(c => c.name === classData.name);
      if (!existing) {
        console.log(`Creating example class: ${classData.name}`);
        await Class.create(classData);
      }
    }

    // Enroll students in classes
    const allStudents = await Student.findAll();
    const allClasses = await Class.findAll();
    if (allStudents.length && allClasses.length) {
      // Enroll first student in first class, second in second
      if (allStudents[0] && allClasses[0]) {
        const enrolled = await StudentClass.findClassesByStudent(allStudents[0]._id);
        if (!enrolled.includes(allClasses[0]._id)) {
          await StudentClass.create({ studentId: allStudents[0]._id, classId: allClasses[0]._id });
        }
      }
      if (allStudents[1] && allClasses[1]) {
        const enrolled = await StudentClass.findClassesByStudent(allStudents[1]._id);
        if (!enrolled.includes(allClasses[1]._id)) {
          await StudentClass.create({ studentId: allStudents[1]._id, classId: allClasses[1]._id });
        }
      }
    }

    // Link students to parent
    const parent = await User.findByEmail('parent@example.com');
    if (parent) {
      for (const student of allStudents) {
        const exists = await StudentParent.relationshipExists(student._id, parent._id);
        if (!exists) {
          await StudentParent.create({ studentId: student._id, parentId: parent._id });
        }
      }
    }
  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
}

module.exports = initSampleData;