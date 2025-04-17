const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const { User, ROLES } = require('../models/User');
const StudentParent = require('../models/StudentParent');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

/**
 * Get all students - Admin only
 * GET /students
 */
router.get('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const students = await Student.findAll();
    const parents = await User.findByRole(ROLES.PARENT); // Fetch parents
    
    // Format dates for display
    students.forEach(student => {
      if (student.dateOfBirth) {
        const dob = new Date(student.dateOfBirth);
        student.formattedDob = dob.toLocaleDateString();
      }
    });
    
    // Retrieve and clear success and error messages from session
    const success = req.session.success;
    const error = req.session.error;
    req.session.success = null;
    req.session.error = null;

    res.render('admin/students/index', { // Updated path
      user: req.session.user, 
      students,
      parents, // Pass parents to the view
      success,
      error,
      values: {} // Add empty values for form repopulation (though redirect might clear it)
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.render('admin/students/index', { // Updated path
      user: req.session.user, 
      students: [],
      parents: [], // Pass empty parents array on error
      error: 'Failed to load students',
      values: {}
    });
  }
});

/**
 * Delete student - Admin only
 * POST /students/delete/:id
 */
router.post('/delete/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    await Student.delete(studentId);

    req.session.success = 'Student deleted successfully';
    res.redirect('/admin/students'); // Updated path
  } catch (error) {
    console.error('Error deleting student:', error);
    req.session.error = error.message || 'Failed to delete student';
    res.redirect('/admin/students'); // Updated path
  }
});

/**
 * View student details - Admin only
 * GET /students/view/:id
 */
router.get('/view/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.getCompleteProfile(studentId);
    
    if (!student) {
      return res.redirect('/admin/students?error=Student not found'); // Updated path
    }
    
    // Format date of birth
    if (student.dateOfBirth) {
      const dob = new Date(student.dateOfBirth);
      student.formattedDob = dob.toLocaleDateString();
    }
    
    res.render('admin/students/view', { // Updated path
      user: req.session.user,
      student
    });
  } catch (error) {
    console.error('Error viewing student:', error);
    res.redirect('/admin/students?error=' + encodeURIComponent(error.message)); // Updated path
  }
});

module.exports = router;