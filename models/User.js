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
}

module.exports = User;