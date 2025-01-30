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
  console.log('Soy cookies', JSON.stringify(cookies));

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
      { expiresIn: '5s' }
    );
    const newRefreshToken = jwt.sign(
      { username: foundUser.username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '60s' }
    );

    let newRefreshTokenArray = !cookies?.jwt
      ? foundUser.refreshToken
      : foundUser.refreshToken.filter(rt => rt !== cookies.jwt);
    
    if (cookies?.jwt) {
      const refreshToken = cookies.jwt;
      res.clearCookie('jwt', { httpOnly: true, sameSite: 'None' });
      const foundUser = await User.findOne({ refreshToken });
      if (!foundUser) {
        console.log('Se detectó reuso de refresh token en el inicio de sesión');
        newRefreshTokenArray = [];
      }
    }

    foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
    await foundUser.save();
    res.cookie('jwt', newRefreshToken, { httpOnly: true, sameSite: 'None', maxAge: 1000 * 60 * 60 * 24 });
    res.json({ roles, accessToken });
  } catch (error) {
    res.status(401).json({ message: `Error en el inicio de sesión. ${error.message}` });
  }
}

const logOut = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.sendStatus(204);

  try {
    const refreshToken = cookies.jwt;
    res.clearCookie('jwt', { httpOnly: true, sameSite: 'None' });
    const foundUser = await User.findOne({ refreshToken });
    if (!foundUser) {
      return res.sendStatus(204);
    }
  
    foundUser.refreshToken = foundUser.refreshToken.filter(rt => rt !== refreshToken);
    const result = await foundUser.save();
    console.log(result);
    res.sendStatus(204);    
  } catch (error) {
    console.log({ message: `Error en el cierre de sesión. ${error.message}` });
  }
}

const refreshToken = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) return res.status(401).json({ message: 'No se recibió un refresh token en la petición.' });

  const refreshToken = cookies.jwt;
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None' });
  const foundUser = await User.findOne({ refreshToken });
  if (!foundUser) {
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) return res.status(403).json({ message: 'El refresh token recibido está vencido y además no corresponde a ningún usuario registrado.' });

        const hackedUser = await User.findOne({ username: decoded.username });
        hackedUser.refreshToken = [];
        await hackedUser.save();
      }
    );
    return res.status(403).json({ message: 'Se detectó un intento de ataque. Por favor, inicie sesión nuevamente.' })
  }

  let newRefreshTokenArray = foundUser.refreshToken.filter(rt => rt !== refreshToken);

  jwt.verify(
    refreshToken,
    process.env.REFRESH_TOKEN_SECRET,
    async (err, decoded) => {
      if (err || foundUser.username !== decoded.username) {
        foundUser.refreshToken = [...newRefreshTokenArray];
        await foundUser.save();
        return res.status(403).json({ message: 'El refresh token recibido está vencido.' });
      }

      const roles = Object.values(foundUser.roles);
      const accessToken = jwt.sign(
        { username: foundUser.username, roles },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '5s' }
      );
      const newRefreshToken = jwt.sign(
        { username: foundUser.username },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '10s' }
      );
      foundUser.refreshToken = [...newRefreshTokenArray, newRefreshToken];
      await foundUser.save();
      res.cookie('jwt', newRefreshToken, { httpOnly: true, sameSite: 'None' });
      res.json({ roles, accessToken });
    }
  );
}

module.exports = { registerAccount, logIn, logOut, refreshToken };