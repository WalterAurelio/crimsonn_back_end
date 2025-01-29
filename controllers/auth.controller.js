const User = require('../model/User');
const bcrypt = require('bcrypt');
const generateVerificationCode = require('../utils/generateVerificationCode');
const jwt = require('jsonwebtoken');

const registerAccount = async (req, res) => {
  const { firstname, lastname, email, password } = req.body;

  if (!firstname || !lastname || !email || !password) return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
  
  try {
    const duplicate = await User.findOne({ email });
    if (duplicate) return res.status(409).json({ message: 'Ya existe un usuario registrado con este correo electrónico.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationCode();
    const newUser = await User.create({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      verificationToken,
      verificationTokenExpiresAt: Date.now() + 1000 * 60 * 60 * 24
    });
    res.status(201).json({
      message: `Usuario ${firstname} ${lastname} creado con éxito.`,
      user: {
        ...newUser._doc,
        password: undefined
      }
    });
  } catch (error) {
    res.status(500).json({ message: `Error en la creación del usuario. ${error.message}` });
  }
};

const logIn = async (req, res) => {
  const { email, password } = req.body;
  const cookies = req.cookies;
  console.log('Soy cookies', cookies);

  if (!email || !password) return res.status(400).json({ message: 'Todos los campos son obligatorios.' });

  try {
    const foundUser = await User.findOne({ email });
    if (!foundUser) return res.status(409).json({ message: 'No existe un usuario registrado con este correo electrónico.' });

    const validPassword = await bcrypt.compare(password, foundUser.password);
    if (!validPassword) return res.status(401).json({ message: 'La contraseña ingresada no es correcta.' });

    const roles = Object.values(foundUser.roles);
    const accessToken = jwt.sign(
      { username: foundUser.username, roles },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '60s' }
    );
    const newRefreshToken = jwt.sign(
      { username: foundUser.username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '1d' }
    );

    let newRefreshTokenArray = !cookies?.jwt
      ? foundUser.refreshToken
      : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);
    
    if (cookies?.jwt) {
      const refreshToken = cookies.jwt;
      const foundUser = await User.findOne({ refreshToken });
      if (!foundUser) {
        console.log('Se detectó reuso de refresh token en el inicio de sesión');
        newRefreshTokenArray = [];
      }
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None' });
    }

    foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
    await foundUser.save();

    res.cookie('jwt', newRefreshToken, { httpOnly: true, sameSite: 'None', maxAge: 1000 * 60 * 60 * 24 });
    res.json({ roles, accessToken });
  } catch (error) {
    res.status(401).json({ message: `Error en el inicio de sesión. ${error.message}` });
  }
}

module.exports = { registerAccount, logIn };