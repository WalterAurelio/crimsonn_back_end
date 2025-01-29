const express = require('express');
const router = express.Router();
const { registerAccount, logIn } = require('../controllers/auth.controller');

router.post('/register', registerAccount);
router.post('/login', logIn);

module.exports = router;