const Joi = require('joi')
const expressError = require('./expressError')

const validateNewPost = (req, res, next) => { 
	const postSchema = Joi.object({
		postContent: Joi.string().max(8000).min(15).required(),
	})

	const { error } = postSchema.validate(req.body)
	if(error){
		const message = error.details.map(ele => ele.message).join(', ')
		throw new expressError(message, 400)
	}
	next()
}

module.exports = validateNewPost