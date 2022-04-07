const mongoose = require('mongoose')

const delLogsSchema = new mongoose.Schema({
	id: {
		type: String,
		required: true
	},
	reason: {
		type: String,
		maxLength: 8000,
		minLength: 15,
		required: true
	}
})

module.exports = mongoose.model('DelLog', delLogsSchema)