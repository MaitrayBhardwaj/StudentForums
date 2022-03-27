const mongoose = require('mongoose')
const Post = require('./posts')

const threadSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		maxLength: 50,
		minLength: 5
	},
	OP: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	OPName: {
		type: String,
		required: true
	},
	createdAt: {
		type: Date,
		default: Date.now()
	},
	posts: [{
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Post'
	}],
	lastModified: {
		type: Date,
		default: Date.now()
	},
	category: {
		type: String,
		enum: ['General Discussion', 'Doubt Solving', 'Consultation', 'Resources', 'Support', 'Miscellaneous'],
		required: true
	}
})

threadSchema.post('findOneAndDelete', async (data) => {
	for(let post of data.posts){
		Post.findByIdAndDelete(post._id)
	}
})

module.exports = mongoose.model('Thread', threadSchema)