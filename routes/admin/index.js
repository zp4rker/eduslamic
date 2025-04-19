const express = require('express');
const router = express.Router();

// Import sub-routers
const classRoutes = require('./classes'); // Updated path
const studentRoutes = require('./students'); // Updated path
const userRoutes = require('./users'); // Updated path

// Mount sub-routers
router.use('/classes', classRoutes);
router.use('/students', studentRoutes);
router.use('/users', userRoutes);

module.exports = router;
