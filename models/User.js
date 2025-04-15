const PouchDB = require('pouchdb');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('users');

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data including name, email, phone, and password
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

      // Create user document with UUID (no prefix)
      const user = {
        _id: uuidv4(),
        name: userData.name,
        email: userData.email,
        phone: userData.phone,
        password: hashedPassword,
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
   * @param {Object} updateData - Data to update (name, email, phone)
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
      
      // Update user properties
      user.name = updateData.name || user.name;
      user.email = updateData.email || user.email;
      user.phone = updateData.phone || user.phone;
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
}

module.exports = User;