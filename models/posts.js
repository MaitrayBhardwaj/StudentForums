const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
	authorName: {
		type: String,
		required: true,
	},
	postContent: {
		type: String,
		minLength: 15,
		maxLength: 1000,
		required: true
	}
	createdAt: {
		type: Date,
		required: true,
	}
})

module.exports = mongoose.model('Post', postSchema)