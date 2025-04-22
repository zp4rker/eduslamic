const PouchDB = require('pouchdb');
const { v4: uuidv4 } = require('uuid');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('student_classes', { prefix: './db/' });

// Ensure indexes are created on startup
db.createIndex({
  index: { fields: ['studentId', 'classId'] }
}).then(() => {
  console.log('Index created for studentId, classId in student_classes');
}).catch(err => {
  if (err.name !== 'conflict') { // Ignore if index already exists
      console.error('Error creating studentId, classId index:', err);
  }
});

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
          studentId: studentId
        }
      });
      
      return result.docs.map(doc => doc.classId);
    } catch (error) {
      console.error(`Error in findClassesByStudent for student ${studentId}:`, error);
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
          classId: classId
        }
      });
      
      return result.docs.map(doc => doc.studentId);
    } catch (error) {
      console.error(`Error in findStudentsByClass for class ${classId}:`, error);
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
          classId: classId
        }
      });
      
      return result.docs.length > 0;
    } catch (error) {
      console.error(`Error checking enrollment for student ${studentId} in class ${classId}:`, error);
      throw error;
    }
  }
  
  /**
   * Remove student from class (delete the enrollment record)
   * @param {string} studentId - Student ID
   * @param {string} classId - Class ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeFromClass(studentId, classId) {
    try {
      const result = await db.find({
        selector: {
          studentId: studentId,
          classId: classId
        }
      });

      if (result.docs.length === 0) {
        return false; // Indicate not found
      }

      const enrollmentDoc = result.docs[0];

      // Use db.remove with the document object (which includes _id and _rev)
      const removeResult = await db.remove(enrollmentDoc);

      if (removeResult.ok) {
        return true;
      } else {
        // This case might not be reached if remove throws an error, but included for completeness
        console.error(`Failed to remove enrollment record ${enrollmentDoc._id}. Result:`, removeResult);
        return false;
      }

    } catch (error) {
      console.error(`Error removing enrollment for student ${studentId} in class ${classId}:`, error);
      return false; // Indicate failure
    }
  }
}

module.exports = StudentClass;