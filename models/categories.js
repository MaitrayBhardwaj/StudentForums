const mongoose = require('mongoose')

const catSchema = new mongoose.Schema({
	name: {
		type: String
	},
	desc: {
		type: String
	}
})

module.exports = mongoose.model('Category', catSchema)