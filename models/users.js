const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		maxLength: 50,
		minLength: 5
	},
	aboutMe: {
		type: Number,
		required: true,
		default: 0,
		min: 0
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
	}
})

module.exports = mongoose.model('Profile', userSchema)