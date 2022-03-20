const mongoose = require('mongoose')

const threadSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		maxLength: 50,
		minLength: 5
	},
	// OP: {
	// 	type: mongoose.Schema.Types.ObjectId,
	// 	ref: 'User',
	// 	required: true
	// },
	OPName: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date,
		required: true,
		default: Date.now()
	},
	posts: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Post'
	}]
})

module.exports = mongoose.model('Thread', threadSchema)