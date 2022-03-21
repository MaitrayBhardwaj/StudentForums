const mongoose = require('mongoose')

const catSchema = new mongoose.Schema({
	name: {
		type: String
	},
	desc: {
		type: String
	},
	recThreads: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Thread'
	}]
})

module.exports = mongoose.model('Category', catSchema)