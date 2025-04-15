const { User, ROLES } = require('./User');

/**
 * Creates default users for development/testing if they don't exist
 * @returns {Promise<void>}
 */
async function setupDefaultUser() {
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
  } catch (error) {
    console.error('Error creating default users:', error);
  }
}

module.exports = setupDefaultUser;