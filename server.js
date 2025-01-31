require('dotenv').config();
const connectDatabase = require('./config/dbConn');
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3000;
const cookieParser = require('cookie-parser');
const authRoutes = require('./routes/auth.routes');
const verifyJWT = require('./middlewares/verifyJWT');
const profileRoutes = require('./routes/profile.routes');

// Conectamos la base de datos
connectDatabase();

// URL encoded middleware
app.use(express.urlencoded({ extended: false }));

// JSON middleware
app.use(express.json());

// Cookie parser
app.use(cookieParser());

app.use('/api/auth', authRoutes);

// Verify JWT
app.use(verifyJWT);

app.use('/profile', profileRoutes);

// Escuchamos el puerto
mongoose.connection.once('open', () => {
  console.log('Conexión establecida con la base de datos');
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
});