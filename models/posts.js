const mongoose = require('mongoose')
const Thread = require('./threads')
const User = require('./users')

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

// postSchema.post('findOneAndDelete', async function (data) {
// 	const { parentThread, author } = await Thread.findById(data.parentThread).populate('posts').populate('author')
// 	for(let i = 0; i < posts.length; i++){
// 		if(posts[i]._id.equals(data._id)){
// 			posts.splice(i, 1)
// 			break
// 		}
// 	}
// 	author.postCount = author.postCount - 1
// 	await author.save()
// })

module.exports = mongoose.model('Post', postSchema)