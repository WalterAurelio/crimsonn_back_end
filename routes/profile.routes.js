const express = require('express');
const router = express.Router();
const { goToProfile } = require('../controllers/profile.controller');
const verifyRoles = require('../middlewares/verifyRoles');
const { Admin, Editor, User } = require('../config/rolesList');

router.get('/', verifyRoles(Admin), goToProfile);

module.exports = router;
