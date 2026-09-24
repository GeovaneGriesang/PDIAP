'use strict';
require('dotenv').config();
const mongoose = require('mongoose');
require('../configs/db-config');
const Projeto = require('../models/projeto-schema');

mongoose.connection.once('open', async () => {
	const total = await Projeto.countDocuments({});
	const semEscola = await Projeto.countDocuments({ $or: [{ escola: { $exists: false } }, { escola: null }] });
	console.log('total: ' + total + ' | sem escola vinculada: ' + semEscola);
	mongoose.connection.close().then(() => process.exit(0));
});
