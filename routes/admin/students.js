const express = require('express');
const router = express.Router();
const Student = require('../../models/Student'); // Corrected path
const { User, ROLES } = require('../../models/User'); // Corrected path
const StudentParent = require('../../models/StudentParent'); // Corrected path
const { isAuthenticated, isAdmin } = require('../../middleware/auth'); // Corrected path

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
 * Create new student - Admin only
 * POST /students/create
 */
router.post('/create', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { name, dateOfBirth, parentIds } = req.body;

    // Basic validation
    if (!name || !dateOfBirth) {
      req.session.error = 'Student name and date of birth are required.';
      req.session.values = req.body; // Pass back submitted values
      return res.redirect('/admin/students');
    }

    // Create the student
    const newStudent = await Student.create({ name, dateOfBirth });

    // Assign parents if provided
    if (parentIds) {
      const ids = Array.isArray(parentIds) ? parentIds : [parentIds];
      for (const parentId of ids) {
        await Student.addParent(newStudent._id, parentId);
      }
    }

    req.session.success = 'Student created successfully';
    res.redirect('/admin/students');
  } catch (error) {
    console.error('Error creating student:', error);
    req.session.error = error.message || 'Failed to create student';
    req.session.values = req.body; // Pass back submitted values on error
    res.redirect('/admin/students');
  }
});

/**
 * GET route to display the edit student form
 * GET /students/edit/:id
 */
router.get('/edit/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const student = await Student.findById(studentId);
    const parents = await User.findByRole(ROLES.PARENT);
    const assignedParentIds = await StudentParent.findParentsByStudent(studentId);

    if (!student) {
      req.session.error = 'Student not found.';
      return res.redirect('/admin/students');
    }

    // Retrieve and clear success/error messages and values from session if redirected back
    const success = req.session.success;
    const error = req.session.error;
    const values = req.session.values || {}; // Get submitted values if redirected on error
    req.session.success = null;
    req.session.error = null;
    req.session.values = null;

    res.render('admin/students/edit', {
      user: req.session.user,
      student,
      parents,
      assignedParentIds: assignedParentIds.map(id => id.toString()), // Ensure IDs are strings for comparison in EJS
      success,
      error,
      values // Pass potentially repopulated values to the view
    });
  } catch (error) {
    console.error('Error fetching student for edit:', error);
    req.session.error = 'Failed to load student data for editing.';
    res.redirect('/admin/students');
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

    // Basic validation
    if (!name || !dateOfBirth) {
      req.session.error = 'Student name and date of birth are required.';
      req.session.values = req.body; // Pass back submitted values
      // Redirect back to the edit page for this student
      return res.redirect(`/admin/students/edit/${studentId}`);
    }

    // Update the student's core details using the correct method name
    await Student.update(studentId, { name, dateOfBirth }); // Changed from updateProfile to update

    // Update parent associations
    const currentParentIds = await StudentParent.findParentsByStudent(studentId);
    const newParentIds = parentIds ? (Array.isArray(parentIds) ? parentIds : [parentIds]) : [];

    // Remove parents that were unselected
    for (const currentId of currentParentIds) {
      if (!newParentIds.includes(currentId)) {
        await Student.removeParent(studentId, currentId);
      }
    }

    // Add newly selected parents
    for (const newId of newParentIds) {
      if (!currentParentIds.includes(newId)) {
        await Student.addParent(studentId, newId);
      }
    }

    req.session.success = 'Student updated successfully';
    res.redirect('/admin/students'); // Redirect to the list page on success
  } catch (error) {
    console.error('Error updating student:', error);
    req.session.error = error.message || 'Failed to update student';
    req.session.values = req.body; // Pass back submitted values on error
    // Redirect back to the edit page for this student on error
    res.redirect(`/admin/students/edit/${req.params.id}`);
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
 * API endpoint to get student details for modal view
 * GET /admin/students/api/details/:id
 */
router.get('/api/details/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const studentId = req.params.id;
    const studentProfile = await Student.getCompleteProfile(studentId);

    if (!studentProfile) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Ensure date of birth is formatted
    let formattedDob = 'N/A';
    if (studentProfile.dateOfBirth) {
        try {
            const dob = new Date(studentProfile.dateOfBirth);
            // Check if dob is a valid date before formatting
            if (!isNaN(dob.getTime())) {
                formattedDob = dob.toLocaleDateString();
            } else {
                console.warn(`Invalid dateOfBirth found for student ${studentId}: ${studentProfile.dateOfBirth}`);
            }
        } catch (dateError) {
            console.error(`Error formatting dateOfBirth for student ${studentId}:`, dateError);
        }
    }

    // Prepare data for the modal
    const responseData = {
      student: {
        _id: studentProfile._id,
        name: studentProfile.name,
        formattedDob: formattedDob // Use the formatted date
      },
      // The modal expects a single parent object, let's take the first one if available
      parent: studentProfile.parents && studentProfile.parents.length > 0 ? studentProfile.parents[0] : null,
      classes: studentProfile.classes || []
    };

    res.json(responseData);

  } catch (error) {
    console.error('Error fetching student details for API:', error);
    // Ensure a JSON error response is sent
    res.status(500).json({ error: error.message || 'Failed to load student details' });
  }
});

module.exports = router;