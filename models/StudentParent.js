const PouchDB = require('pouchdb');
const { v4: uuidv4 } = require('uuid');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('student_parents', { prefix: './db/' });

/**
 * StudentParent model for managing relationships between students and parents
 */
class StudentParent {
  /**
   * Create a new student-parent relationship
   * @param {Object} data - Relationship data including studentId and parentId
   * @returns {Promise<Object>} - The created relationship object
   */
  static async create(data) {
    try {
      // Validate required fields
      if (!data.studentId || !data.parentId) {
        throw new Error('Both studentId and parentId are required');
      }

      // Create relationship document
      const relationship = {
        _id: uuidv4(),
        studentId: data.studentId,
        parentId: data.parentId,
        relationship: data.relationship || 'Parent', // e.g., Parent, Guardian, etc.
        createdAt: new Date().toISOString()
      };

      const result = await db.put(relationship);
      relationship._rev = result.rev;
      
      return relationship;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find parents for a student
   * @param {string} studentId - Student ID
   * @returns {Promise<Array<string>>} - Array of parent IDs
   */
  static async findParentsByStudent(studentId) {
    try {
      const result = await db.find({
        selector: { studentId: studentId }
      });
      
      return result.docs.map(doc => doc.parentId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find students for a parent
   * @param {string} parentId - Parent ID
   * @returns {Promise<Array<string>>} - Array of student IDs
   */
  static async findStudentsByParent(parentId) {
    try {
      const result = await db.find({
        selector: { parentId: parentId }
      });
      
      return result.docs.map(doc => doc.studentId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a student-parent relationship exists
   * @param {string} studentId - Student ID
   * @param {string} parentId - Parent ID
   * @returns {Promise<boolean>} - True if relationship exists
   */
  static async relationshipExists(studentId, parentId) {
    try {
      const result = await db.find({
        selector: {
          studentId: studentId,
          parentId: parentId
        }
      });
      
      return result.docs.length > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a student-parent relationship
   * @param {string} studentId - Student ID
   * @param {string} parentId - Parent ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeRelationship(studentId, parentId) {
    try {
      const result = await db.find({
        selector: {
          studentId: studentId,
          parentId: parentId
        }
      });
      
      if (result.docs.length === 0) {
        return false;
      }
      
      // Remove all matching relationships (should be just one)
      for (const doc of result.docs) {
        await db.remove(doc);
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = StudentParent;