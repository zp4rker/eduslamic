const PouchDB = require('pouchdb');
const { v4: uuidv4 } = require('uuid');
const StudentParent = require('./StudentParent');
const StudentClass = require('./StudentClass');
const User = require('./User').User;
const Class = require('./Class');
PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('students', { prefix: './db/' });

/**
 * Student model representing a student in the education system
 */
class Student {
  /**
   * Create a new student
   * @param {Object} studentData - Student data including name, dateOfBirth
   * @returns {Promise<Object>} - The created student object
   */
  static async create(studentData) {
    try {
      // Create student document with UUID
      const student = {
        _id: uuidv4(),
        name: studentData.name,
        dateOfBirth: studentData.dateOfBirth,
        createdAt: new Date().toISOString()
      };

      const result = await db.put(student);
      student._rev = result.rev;
      
      return student;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get student by ID
   * @param {string} studentId - Student's ID
   * @returns {Promise<Object|null>} - The student object or null
   */
  static async findById(studentId) {
    try {
      const student = await db.get(studentId);
      return student;
    } catch (error) {
      if (error.name === 'not_found') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update student information
   * @param {string} studentId - Student's ID
   * @param {Object} updateData - Data to update (name, dateOfBirth)
   * @returns {Promise<Object>} - The updated student object
   */
  static async update(studentId, updateData) {
    try {
      // Get the current student document
      const student = await db.get(studentId);
      
      // Update student properties
      student.name = updateData.name || student.name;
      student.dateOfBirth = updateData.dateOfBirth || student.dateOfBirth;
      student.updatedAt = new Date().toISOString();
      
      // Save the updated document
      const result = await db.put(student);
      student._rev = result.rev;
      
      return student;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a student
   * @param {string} studentId - Student's ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(studentId) {
    try {
      const student = await db.get(studentId);
      await db.remove(student);
      return true;
    } catch (error) {
      if (error.name === 'not_found') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get all students
   * @returns {Promise<Array<Object>>} - Array of student objects
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
   * Get student with populated parent data
   * @param {string} studentId - Student's ID
   * @returns {Promise<Object>} - Student with parents array
   */
  static async findByIdWithParents(studentId) {
    try {
      const student = await this.findById(studentId);
      if (!student) return null;
      
      // Get parent IDs
      const parentIds = await StudentParent.findParentsByStudent(studentId);
      
      // Fetch parent details
      const parents = [];
      for (const parentId of parentIds) {
        const parent = await User.findById(parentId);
        if (parent) {
          // Remove sensitive information
          const { password, ...parentData } = parent;
          parents.push(parentData);
        }
      }
      
      // Add parents to student object
      student.parents = parents;
      
      return student;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get student with populated class data
   * @param {string} studentId - Student's ID
   * @returns {Promise<Object>} - Student with classes array
   */
  static async findByIdWithClasses(studentId) {
    try {
      const student = await this.findById(studentId);
      if (!student) return null;
      
      // Get class IDs
      const classIds = await StudentClass.findClassesByStudent(studentId);
      
      // Fetch class details
      const classes = [];
      for (const classId of classIds) {
        const classObj = await Class.findById(classId);
        if (classObj) {
          classes.push(classObj);
        }
      }
      
      // Add classes to student object
      student.classes = classes;
      
      return student;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get complete student data with parents and classes
   * @param {string} studentId - Student's ID
   * @returns {Promise<Object>} - Student with parents and classes arrays
   */
  static async getCompleteProfile(studentId) {
    try {
      const student = await this.findById(studentId);
      if (!student) return null;
      
      // Get parent IDs and details
      const parentIds = await StudentParent.findParentsByStudent(studentId);
      const parents = [];
      for (const parentId of parentIds) {
        const parent = await User.findById(parentId);
        if (parent) {
          // Remove sensitive information
          const { password, ...parentData } = parent;
          parents.push(parentData);
        }
      }
      
      // Get class IDs and details
      const classIds = await StudentClass.findClassesByStudent(studentId);
      const classes = [];
      for (const classId of classIds) {
        const classObj = await Class.findById(classId);
        if (classObj) {
          classes.push(classObj);
        }
      }
      
      // Add relationships to student object
      student.parents = parents;
      student.classes = classes;
      
      return student;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Add a parent to a student
   * @param {string} studentId - Student's ID
   * @param {string} parentId - Parent's ID
   * @param {string} relationship - Type of relationship (optional)
   * @returns {Promise<Object>} - The created relationship
   */
  static async addParent(studentId, parentId, relationship = 'Parent') {
    return StudentParent.create({
      studentId,
      parentId,
      relationship
    });
  }

  /**
   * Remove a parent from a student
   * @param {string} studentId - Student's ID
   * @param {string} parentId - Parent's ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeParent(studentId, parentId) {
    return StudentParent.removeRelationship(studentId, parentId);
  }

  /**
   * Enroll student in a class
   * @param {string} studentId - Student's ID
   * @param {string} classId - Class's ID
   * @returns {Promise<Object>} - The created enrollment
   */
  static async enrollInClass(studentId, classId) {
    return StudentClass.create({
      studentId,
      classId
    });
  }

  /**
   * Remove student from a class
   * @param {string} studentId - Student's ID
   * @param {string} classId - Class's ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeFromClass(studentId, classId) {
    return StudentClass.removeFromClass(studentId, classId);
  }

  /**
   * Mark a class as completed for a student
   * @param {string} studentId - Student's ID
   * @param {string} classId - Class's ID
   * @returns {Promise<boolean>} - Success status
   */
  static async completeClass(studentId, classId) {
    return StudentClass.completeClass(studentId, classId);
  }

  /**
   * Find students by parent ID
   * @param {string} parentId - Parent's ID
   * @returns {Promise<Array<Object>>} - Array of student objects
   */
  static async findByParentId(parentId) {
    try {
      // Get student IDs for this parent
      const studentIds = await StudentParent.findStudentsByParent(parentId);
      
      // Fetch student objects
      const students = [];
      for (const studentId of studentIds) {
        const student = await this.findById(studentId);
        if (student) {
          students.push(student);
        }
      }
      
      return students;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Find students by class ID
   * @param {string} classId - Class's ID
   * @returns {Promise<Array<Object>>} - Array of student objects
   */
  static async findByClassId(classId) {
    try {
      // Get student IDs for this class
      const studentIds = await StudentClass.findStudentsByClass(classId);
      
      // Fetch student objects
      const students = [];
      for (const studentId of studentIds) {
        const student = await this.findById(studentId);
        if (student) {
          students.push(student);
        }
      }
      
      return students;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Student;