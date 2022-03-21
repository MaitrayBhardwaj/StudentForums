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
		maxLength: 8000,
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
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