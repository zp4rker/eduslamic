const PouchDB = require('pouchdb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('users', { prefix: './db/' });

// Define valid roles
const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  PARENT: 'parent'
};

// Design doc for views
const designDoc = {
  _id: '_design/users',
  views: {
    by_role: {
      map: function (doc) {
        if (doc.roles && Array.isArray(doc.roles)) {
          doc.roles.forEach(function(role) {
            emit(role, doc);
          });
        }
      }.toString()
    }
  }
};

// Initialize design doc
async function initializeDesignDocs() {
  try {
    await db.put(designDoc);
    console.log('User design document created/updated successfully');
  } catch (err) {
    if (err.name !== 'conflict') {
      console.error('Error creating/updating user design document:', err);
    } else {
      console.log('User design document already exists');
      try {
        const doc = await db.get('_design/users');
        designDoc._rev = doc._rev;
        await db.put(designDoc);
        console.log('User design document updated successfully');
      } catch (updateErr) {
        console.error('Error updating user design document:', updateErr);
      }
    }
  }
}

async function initializeIndexes() {
  try {
    await db.createIndex({ index: { fields: ['email'] } });
    console.log('Email index created successfully');
    await initializeDesignDocs(); // Initialize design docs here
  } catch (err) {
    console.error('Error creating index or design doc:', err);
  }
}

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data including name, email, phone, password, and roles (array or string)
   * @returns {Promise<Object>} - The created user object
   */
  static async create(userData) {
    try {
      // Check if user with email already exists
      const existingUser = await this.findByEmail(userData.email);
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Validate roles or set default to parent
      let roles = [];
      if (userData.roles) {
        const requestedRoles = Array.isArray(userData.roles) ? userData.roles : [userData.roles];
        roles = requestedRoles.filter(role => Object.values(ROLES).includes(role));
      }
      
      if (roles.length === 0) {
        roles = [ROLES.PARENT]; // Default role
      }

      // Create user document with UUID (no prefix)
      const user = {
        _id: uuidv4(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
        roles: roles, // Changed from role to roles (array)
        createdAt: new Date().toISOString()
      };

      const result = await db.put(user);
      user._rev = result.rev;
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find a user by email
   * @param {string} email - User's email
   * @returns {Promise<Object|null>} - The user object or null
   */
  static async findByEmail(email) {
    try {
      const result = await db.find({
        selector: { email: email }
      });

      if (result.docs.length === 0) {
        return null;
      }

      return result.docs[0];
    } catch (error) {
      throw error;
    }
  }

  /**
   * Authenticate a user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<Object|null>} - The user object without password or null
   */
  static async authenticate(email, password) {
    try {
      const user = await this.findByEmail(email);
      if (!user) {
        return null;
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return null;
      }

      // Return user without password
      const { password: pw, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update user information
   * @param {string} userId - User's ID
   * @param {Object} updateData - Data to update (name, email, phone, roles)
   * @returns {Promise<Object>} - The updated user object
   */
  static async updateProfile(userId, updateData) {
    try {
      // Get the current user document
      const user = await db.get(userId);
      
      // Check if email is being changed and if it's already in use
      if (updateData.email && updateData.email !== user.email) {
        const existingUser = await this.findByEmail(updateData.email);
        if (existingUser && existingUser._id !== userId) {
          throw new Error('Email is already in use by another account');
        }
      }
      
      // Validate roles if provided
      let newRoles = user.roles; // Keep existing roles by default
      if (updateData.roles) {
        const requestedRoles = Array.isArray(updateData.roles) ? updateData.roles : [updateData.roles];
        const validRoles = requestedRoles.filter(role => Object.values(ROLES).includes(role));
        if (validRoles.length > 0) { // Only update if at least one valid role is provided
          newRoles = validRoles;
        } else {
          console.warn(`Update for user ${userId} provided invalid/empty roles. Keeping existing roles.`);
        }
      }
      
      // Update user properties
      user.name = updateData.name || user.name;
      user.email = updateData.email || user.email;
      user.phone = updateData.phone || user.phone;
      user.roles = newRoles; // Update roles
      user.updatedAt = new Date().toISOString();
      
      // Save the updated document
      const result = await db.put(user);
      user._rev = result.rev;
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update user password
   * @param {string} userId - User's ID
   * @param {string} currentPassword - Current password for verification
   * @param {string} newPassword - New password to set
   * @returns {Promise<boolean>} - Success status
   */
  static async updatePassword(userId, currentPassword, newPassword) {
    try {
      // Get the current user document
      const user = await db.get(userId);
      
      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        throw new Error('Current password is incorrect');
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      // Update password
      user.password = hashedPassword;
      user.updatedAt = new Date().toISOString();
      
      // Save the updated document
      await db.put(user);
      
      return true;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get user by ID
   * @param {string} userId - User's ID
   * @returns {Promise<Object|null>} - The user object or null
   */
  static async findById(userId) {
    try {
      const user = await db.get(userId);
      return user;
    } catch (error) {
      if (error.name === 'not_found') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Find users by role using the map/reduce view
   * @param {string} role - Role to filter by
   * @returns {Promise<Array<Object>>} - Array of users with the given role
   */
  static async findByRole(role) {
    try {
      if (!Object.values(ROLES).includes(role)) {
        throw new Error('Invalid role');
      }

      // Use the view to find users by role
      const result = await db.query('users/by_role', {
        key: role,
        include_docs: true
      });

      return result.rows.map(row => {
        const { password, ...userWithoutPassword } = row.doc;
        return userWithoutPassword;
      });
    } catch (error) {
      if (error.name === 'not_found' && error.message.includes('_design/users')) {
        console.error("User 'by_role' view not found. Make sure initializeIndexes() has run.");
        await initializeDesignDocs();
        try {
          const retryResult = await db.query('users/by_role', {
            key: role,
            include_docs: true
          });
          return retryResult.rows.map(row => {
            const { password, ...userWithoutPassword } = row.doc;
            return userWithoutPassword;
          });
        } catch (retryError) {
          console.error("Retry failed after attempting to initialize design doc:", retryError);
          throw retryError;
        }
      }
      throw error;
    }
  }

  /**
   * Check if user has a specific role
   * @param {string} userId - User's ID
   * @param {string} role - Role to check
   * @returns {Promise<boolean>} - True if user has the role, false otherwise
   */
  static async hasRole(userId, role) {
    try {
      const user = await this.findById(userId);
      return user && Array.isArray(user.roles) && user.roles.includes(role);
    } catch (error) {
      if (error.name === 'not_found') {
        return false;
      }
      console.error(`Error checking role for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Check if user is an admin
   * @param {string} userId - User's ID
   * @returns {Promise<boolean>} - True if user is admin, false otherwise
   */
  static async isAdmin(userId) {
    return this.hasRole(userId, ROLES.ADMIN);
  }

  /**
   * Get all valid roles
   * @returns {Object} - Object containing all valid roles
   */
  static getRoles() {
    return ROLES;
  }

  /**
   * Get all users
   * @returns {Promise<Array<Object>>} - Array of user objects with passwords removed
   */
  static async findAll() {
    try {
      const result = await db.allDocs({
        include_docs: true
      });
      
      return result.rows
        .filter(row => row.doc && 
                       row.doc._id && 
                       !row.doc._id.startsWith('_') && 
                       row.doc.name && 
                       row.doc.email)
        .map(row => {
          const { password, ...userWithoutPassword } = row.doc;
          return userWithoutPassword;
        });
    } catch (error) {
      throw error;
    }
  }
}

module.exports = { User, ROLES, db, initializeIndexes };