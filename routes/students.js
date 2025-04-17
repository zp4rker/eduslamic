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

    res.render('students/index', { 
      user: req.session.user, 
      students,
      parents, // Pass parents to the view
      success,
      error,
      values: {} // Add empty values for form repopulation (though redirect might clear it)
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.render('students/index', { 
      user: req.session.user, 
      students: [],
      parents: [], // Pass empty parents array on error
      error: 'Failed to load students',
      values: {}
    });
  }
});

/**
 * Show student create form - Admin only
 * GET /students/create
 */
router.get('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Get all parents (users with parent role)
    const parents = await User.findByRole(ROLES.PARENT);
    
    res.render('students/create', { 
      user: req.session.user, 
      parents,
      values: {},
      error: null
    });
  } catch (error) {
    console.error('Error loading create student form:', error);
    res.redirect('/students?error=Failed to load create form');
  }
});

/**
 * Create new student - Admin only
 * POST /students/create
 */
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, dateOfBirth, parentIds } = req.body;

    if (!name || !dateOfBirth) {
      req.session.error = 'Name and date of birth are required';
      return res.redirect('/students');
    }

    const student = await Student.create({
      name,
      dateOfBirth
    });

    if (parentIds) {
      const parentIdArray = Array.isArray(parentIds) ? parentIds : [parentIds];
      for (const parentId of parentIdArray) {
        await Student.addParent(student._id, parentId);
      }
    }

    req.session.success = 'Student created successfully';
    res.redirect('/students');
  } catch (error) {
    console.error('Error creating student:', error);
    req.session.error = error.message || 'Failed to create student';
    res.redirect('/students');
  }
});

/**
 * Show student edit form - Admin only
 * GET /students/edit/:id
 */
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findByIdWithParents(studentId);
    
    if (!student) {
      return res.redirect('/students?error=Student not found');
    }
    
    // Get all parents
    const allParents = await User.findByRole(ROLES.PARENT);
    
    // Create array of parent IDs already linked to the student
    const linkedParentIds = student.parents ? student.parents.map(p => p._id) : [];
    
    res.render('students/edit', {
      user: req.session.user,
      student,
      allParents,
      linkedParentIds,
      error: req.query.error
    });
  } catch (error) {
    console.error('Error loading edit student form:', error);
    res.redirect('/students?error=' + encodeURIComponent(error.message));
  }
});

/**
 * Update student - Admin only
 * POST /students/edit/:id
 */
router.post('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const { name, dateOfBirth, parentIds } = req.body;
    
    // Update student basic info
    await Student.update(studentId, { name, dateOfBirth });
    
    // Handle parent associations
    const currentParentIds = await StudentParent.findParentsByStudent(studentId);
    const newParentIds = parentIds ? (Array.isArray(parentIds) ? parentIds : [parentIds]) : [];
    
    // Remove parents that were unselected
    for (const currentParentId of currentParentIds) {
      if (!newParentIds.includes(currentParentId)) {
        await Student.removeParent(studentId, currentParentId);
      }
    }
    
    // Add newly selected parents
    for (const newParentId of newParentIds) {
      if (!currentParentIds.includes(newParentId)) {
        await Student.addParent(studentId, newParentId);
      }
    }
    
    req.session.success = 'Student updated successfully';
    res.redirect('/students');
  } catch (error) {
    console.error('Error updating student:', error);
    res.redirect(`/students/edit/${req.params.id}?error=${encodeURIComponent(error.message)}`);
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
    res.redirect('/students');
  } catch (error) {
    console.error('Error deleting student:', error);
    req.session.error = error.message || 'Failed to delete student';
    res.redirect('/students');
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
      return res.redirect('/students?error=Student not found');
    }
    
    // Format date of birth
    if (student.dateOfBirth) {
      const dob = new Date(student.dateOfBirth);
      student.formattedDob = dob.toLocaleDateString();
    }
    
    res.render('students/view', {
      user: req.session.user,
      student
    });
  } catch (error) {
    console.error('Error viewing student:', error);
    res.redirect('/students?error=' + encodeURIComponent(error.message));
  }
});

module.exports = router;