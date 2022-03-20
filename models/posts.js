const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
	// author: {
	// 	type: mongoose.Schema.Types.ObjectId,
	// 	ref: 'User'
	// 	required: true,
	// },
	authorName: {
		type: String,
		required: true,
		default: 'Biochemistry'
	},
	postContent: {
		type: String,
		minLength: 15,
		maxLength: 1000,
		required: true
	},
	createdAt: {
		type: Date,
	},
	modifiedAt: {
		type: Date
	},
	parentThread: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Thread'
	}
})

module.exports = mongoose.model('Post', postSchema)