const mongoose = require('mongoose')
const passportLocalMongoose = require('passport-local-mongoose')
const Post = require('./posts')

const userSchema = new mongoose.Schema({
	email: {
		type: String,
		required: true
	},
	joinedOn: {
		type: Date,
		default: Date.now()
	},
	postCount: {
		type: Number,
		default: 0
	},
	aboutMe: {
		type: String,
		minLength: 0,
		maxLength: 10000
	}
})

userSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('User', userSchema)