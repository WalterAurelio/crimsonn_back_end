const User = require('../model/User');

const goToProfile = async (req, res) => {
  const email = req.email;

  if (!email) return res.status(401).json({ message: 'No se recibió un email.' });

  try {
    const foundUser = await User.findOne({ email });
    if (!foundUser) return res.status(401).json({ message: 'No se encontró ningún usuario.' });
    res.json({ message: `Hola, mi email es ${foundUser.email}` });

  } catch (error) {
    console.log('Ocurrió un error en el perfil. ', error.message);
  }
};

module.exports = { goToProfile };