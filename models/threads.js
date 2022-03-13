const mongoose = require('mongoose')

const threadSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		maxLength: 50,
		minLength: 5
	},
	OPName: {
		type: String,
		required: true
	},
	postCount: {
		type: Number,
		required: true,
		default: 0,
		min: 0
	},
	createdAt: {
		type: Date,
		required: true,
	}
})

module.exports = mongoose.model('Thread', threadSchema)