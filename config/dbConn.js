const mongoose = require('mongoose');

const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI, {
      dbName: 'CrimsonnDB'
    });
  } catch (error) {
    console.log('Error al conectar la base de datos. ', error.message);
  }
};

module.exports = connectDatabase;