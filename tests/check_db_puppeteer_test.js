const mongoose = require('mongoose');
const Projeto = require('../models/projeto-schema');

const dbURL = 'mongodb://127.0.0.1:27017/loginapp';
mongoose.connect(dbURL, {useNewUrlParser: true, useUnifiedTopology: true});

mongoose.connection.on('error', (err) => { console.error('Mongo connection error:', err); process.exit(2); });
mongoose.connection.once('open', async () => {
  try {
    const docs = await Projeto.find({ username: { $regex: '^puppeteer_test_' } }).sort({ createdAt: -1 }).limit(10).exec();
    console.log('Found', docs.length, 'documents');
    docs.forEach(d => console.log(d.username, d.nomeProjeto, d.email, d.createdAt));
    process.exit(0);
  } catch (err) {
    console.error('Query error:', err);
    process.exit(2);
  }
});
