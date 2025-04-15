const User = require('./User');

/**
 * Creates a default admin user if it doesn't exist
 * @returns {Promise<void>}
 */
async function setupDefaultUser() {
  try {
    const defaultEmail = 'admin@example.com';
    
    // Check if the default user already exists
    const existingUser = await User.findByEmail(defaultEmail);
    
    if (!existingUser) {
      console.log('Creating default admin user...');
      const defaultUser = {
        name: 'Admin User',
        email: defaultEmail,
        phone: '1234567890',
        password: 'admin123'
      };
      
      await User.create(defaultUser);
      console.log('Default admin user created successfully');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    } else {
      console.log('Default admin user already exists');
    }
  } catch (error) {
    console.error('Error creating default user:', error);
  }
}

module.exports = setupDefaultUser;