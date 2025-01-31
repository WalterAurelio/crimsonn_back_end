const jwt = require('jsonwebtoken');

const verifyJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ message: 'La petición no tiene el header authorization.' });
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'El access token está vencido.' });

    req.email = decoded.email;
    req.roles = decoded.roles;
    console.log('JWT válido! Continúe...');
    next();
  });
};

module.exports = verifyJWT;