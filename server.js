require('dotenv').config();
const connectDatabase = require('./config/dbConn');
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const PORT = process.env.PORT || 3000;
const authRoutes = require('./routes/auth.routes');

// Conectamos la base de datos
connectDatabase();

// URL encoded middleware
app.use(express.urlencoded({ extended: false }));

// JSON middleware
app.use(express.json());


app.use('/api/auth', authRoutes);

// Escuchamos el puerto
mongoose.connection.once('open', () => {
  console.log('Conexión establecida con la base de datos');
  app.listen(PORT, () => {
    console.log(`Servidor escuchando en el puerto ${PORT}`);
  });
});