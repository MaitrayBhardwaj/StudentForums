const mongoose = require('mongoose')
const Thread = require('../models/threads')

mongoose.connect('mongodb://localhost:27017/StuFor')
	.then(() => {
		console.log('Connected to the database')
	})
	.catch(() => {
		console.log('Unable to connect to the database')
	})

const makeThreads = async () => {
	await Thread.insertMany([
		{ title: 'Thread Title 1', OPName: 'User123' },
		{ title: 'Thread Title 2', OPName: 'User234' },
		{ title: 'Thread Title 3', OPName: 'User345' },
		{ title: 'Thread Title 4', OPName: 'User456' }
	])
}

makeThreads()