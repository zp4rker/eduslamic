const express = require('express');
const router = express.Router();

// Import sub-routers
const classRoutes = require('./classes');
const studentRoutes = require('./students');
const userRoutes = require('./users');

// Mount sub-routers
router.use('/classes', classRoutes);
router.use('/students', studentRoutes);
router.use('/users', userRoutes);

module.exports = router;
