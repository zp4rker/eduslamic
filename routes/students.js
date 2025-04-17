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
    
    res.render('students/index', { 
      user: req.session.user, 
      students,
      parents, // Pass parents to the view
      success: req.query.success,
      error: req.query.error,
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
    // Destructure only the needed fields
    const { name, dateOfBirth, parentIds } = req.body;
    
    // Validate inputs
    if (!name || !dateOfBirth) {
      // Fetch parents again for potential re-render (though redirect is used)
      const parents = await User.findByRole(ROLES.PARENT);
      // Redirect back with error and original values (as query params or flash messages if implemented)
      // For simplicity, just redirecting with error message
      return res.redirect('/students?error=' + encodeURIComponent('Name and date of birth are required'));
    }
    
    // Create student
    const student = await Student.create({
      name,
      dateOfBirth
      // Removed other fields like email, phone, address, notes
    });
    
    // Link selected parents
    if (parentIds) {
      // Handle both single and multiple parent selections
      const parentIdArray = Array.isArray(parentIds) ? parentIds : [parentIds];
      
      for (const parentId of parentIdArray) {
        // Ensure parent exists before linking (optional, depends on model logic)
        // const parentExists = await User.findById(parentId);
        // if (parentExists && parentExists.role === ROLES.PARENT) {
           await Student.addParent(student._id, parentId);
        // }
      }
    }
    
    res.redirect('/students?success=Student created successfully');
  } catch (error) {
    console.error('Error creating student:', error);
    // Redirect back to the index page with error
    res.redirect('/students?error=' + encodeURIComponent(error.message || 'Failed to create student'));
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
    
    res.redirect('/students?success=Student updated successfully');
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
    
    res.redirect('/students?success=Student deleted successfully');
  } catch (error) {
    console.error('Error deleting student:', error);
    res.redirect('/students?error=' + encodeURIComponent(error.message));
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