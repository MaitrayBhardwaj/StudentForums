const Joi = require('joi')
const expressError = require('./expressError')

const validateNewThread = (req, res, next) => { 
	const threadSchema = Joi.object({
		title: Joi.string().max(50).min(5).required(),
		postContent: Joi.string().max(8000).min(15).required(),
	})

	const { error } = threadSchema.validate(req.body)
	if(error){
		const message = error.details.map(ele => ele.message).join(', ')
		throw new expressError(message, 400)
	}
	next()
}

module.exports = validateNewThread