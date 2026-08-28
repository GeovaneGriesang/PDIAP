'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');

mongoose.connection.once('open', async () => {
	const total = await Projeto.count({});
	const semEscola = await Projeto.count({ $or: [{ escola: { $exists: false } }, { escola: null }] });
	console.log('total: ' + total + ' | sem escola vinculada: ' + semEscola);
	mongoose.connection.close(() => process.exit(0));
});
