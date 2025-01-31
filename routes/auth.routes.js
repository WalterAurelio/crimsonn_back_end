const express = require('express');
const router = express.Router();
const { registerAccount, logIn, logOut, refreshToken } = require('../controllers/auth.controller');

router.post('/register', registerAccount);
router.post('/login', logIn);
router.get('/logout', logOut);
router.get('/refresh-token', refreshToken);

module.exports = router;