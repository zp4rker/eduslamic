const PouchDB = require('pouchdb');
const { v4: uuidv4 } = require('uuid');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('student_classes');

/**
 * StudentClass model for managing relationships between students and classes
 */
class StudentClass {
  /**
   * Create a new student-class relationship
   * @param {Object} data - Relationship data including studentId and classId
   * @returns {Promise<Object>} - The created relationship object
   */
  static async create(data) {
    try {
      // Validate required fields
      if (!data.studentId || !data.classId) {
        throw new Error('Both studentId and classId are required');
      }

      // Create relationship document
      const relationship = {
        _id: uuidv4(),
        studentId: data.studentId,
        classId: data.classId,
        enrolledAt: data.enrolledAt || new Date().toISOString(),
        status: data.status || 'active', // active, inactive, completed
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
   * Find classes for a student
   * @param {string} studentId - Student ID
   * @returns {Promise<Array<string>>} - Array of class IDs
   */
  static async findClassesByStudent(studentId) {
    try {
      const result = await db.find({
        selector: { 
          studentId: studentId,
          status: 'active'
        }
      });
      
      return result.docs.map(doc => doc.classId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find students in a class
   * @param {string} classId - Class ID
   * @returns {Promise<Array<string>>} - Array of student IDs
   */
  static async findStudentsByClass(classId) {
    try {
      const result = await db.find({
        selector: { 
          classId: classId,
          status: 'active'
        }
      });
      
      return result.docs.map(doc => doc.studentId);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update student-class relationship status
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @param {string} status - New status (active, inactive, completed)
   * @returns {Promise<boolean>} - Success status
   */
  static async updateStatus(studentId, classId, status) {
    try {
      const result = await db.find({
        selector: {
          studentId: studentId,
          classId: classId
        }
      });
      
      if (result.docs.length === 0) {
        return false;
      }
      
      const relationship = result.docs[0];
      relationship.status = status;
      relationship.updatedAt = new Date().toISOString();
      
      await db.put(relationship);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if a student is enrolled in a class
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @returns {Promise<boolean>} - True if enrolled
   */
  static async isEnrolled(studentId, classId) {
    try {
      const result = await db.find({
        selector: {
          studentId: studentId,
          classId: classId,
          status: 'active'
        }
      });
      
      return result.docs.length > 0;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Remove student from class
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeFromClass(studentId, classId) {
    return this.updateStatus(studentId, classId, 'inactive');
  }

  /**
   * Complete student's class
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @returns {Promise<boolean>} - Success status
   */
  static async completeClass(studentId, classId) {
    return this.updateStatus(studentId, classId, 'completed');
  }
}

module.exports = StudentClass;