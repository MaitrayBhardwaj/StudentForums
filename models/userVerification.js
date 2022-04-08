const mongoose = require('mongoose')

const userVerificationSchema = new mongoose.Schema({
	uid: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	OTP: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date
	},
	expires: {
		type: Date
	}
})

module.exports = mongoose.model('UserVerification', userVerificationSchema)