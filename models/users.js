const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		maxLength: 50,
		minLength: 5
	},
	aboutMe: {
		type: String,
		required: true,
		maxLength: 2000,
		minLength: 0
	},
	createdAt: {
		type: Date,
		required: true,
	},
	postCount: {
		type: Number,
		required: true,
		min: 0
	},
	isOnline: {
		type: Boolean,
		required: true
	},
	isAdmin: {
		type: Boolean,
		required: true
	},
	recentPosts: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Post'
	}]
})

module.exports = mongoose.model('User', userSchema)