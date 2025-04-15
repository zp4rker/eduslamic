const PouchDB = require('pouchdb');
const { v4: uuidv4 } = require('uuid');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('classes');

/**
 * Class model representing a class in the education system
 */
class Class {
  /**
   * Create a new class
   * @param {Object} classData - Class data including name, description, teacherId
   * @returns {Promise<Object>} - The created class object
   */
  static async create(classData) {
    try {
      // Create class document with UUID
      const classObj = {
        _id: uuidv4(),
        name: classData.name,
        description: classData.description || '',
        teacherId: classData.teacherId,
        createdAt: new Date().toISOString()
      };

      const result = await db.put(classObj);
      classObj._rev = result.rev;
      
      return classObj;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get class by ID
   * @param {string} classId - Class ID
   * @returns {Promise<Object|null>} - The class object or null
   */
  static async findById(classId) {
    try {
      const classObj = await db.get(classId);
      return classObj;
    } catch (error) {
      if (error.name === 'not_found') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update class information
   * @param {string} classId - Class ID
   * @param {Object} updateData - Data to update (name, description, teacherId)
   * @returns {Promise<Object>} - The updated class object
   */
  static async update(classId, updateData) {
    try {
      // Get the current class document
      const classObj = await db.get(classId);
      
      // Update class properties
      if (updateData.name !== undefined) classObj.name = updateData.name;
      if (updateData.description !== undefined) classObj.description = updateData.description;
      if (updateData.teacherId !== undefined) classObj.teacherId = updateData.teacherId;
      classObj.updatedAt = new Date().toISOString();
      
      // Save the updated document
      const result = await db.put(classObj);
      classObj._rev = result.rev;
      
      return classObj;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a class
   * @param {string} classId - Class ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(classId) {
    try {
      const classObj = await db.get(classId);
      await db.remove(classObj);
      return true;
    } catch (error) {
      if (error.name === 'not_found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all classes
   * @returns {Promise<Array<Object>>} - Array of class objects
   */
  static async findAll() {
    try {
      const result = await db.allDocs({
        include_docs: true
      });
      
      return result.rows.map(row => row.doc);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find classes by teacher ID
   * @param {string} teacherId - Teacher ID
   * @returns {Promise<Array<Object>>} - Array of class objects
   */
  static async findByTeacher(teacherId) {
    try {
      const result = await db.find({
        selector: { teacherId: teacherId }
      });
      
      return result.docs;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Class;