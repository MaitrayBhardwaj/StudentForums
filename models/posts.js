const mongoose = require('mongoose')

const postSchema = new mongoose.Schema({
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true
	},
	authorName: {
		type: String,
		required: true
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

postSchema.post('findOneAndDelete', async function (data) {
	const Thread = require('./threads')
	const User = require('./users')

	console.log(data)
	const parentThread = await Thread.findById(data.parentThread).populate('posts')
	parentThread.posts.pull(data._id)
	await parentThread.save()
	const author = await User.findById(data.author)
	author.postCount = author.postCount - 1
	await author.save()
})

module.exports = mongoose.model('Post', postSchema)