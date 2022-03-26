const Joi = require('joi')
const expressError = require('./expressError')

const validateNewUser = (req, res, next) => { 
	const userSchema = Joi.object({
		email: Joi.string().email().required(),
		username: Joi.string().alphanum().min(2).max(30).required(),
		password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9]{3,30}$'))
	})

	const { error } = userSchema.validate(req.body)
	if(error){
		const message = error.details.map(ele => ele.message).join(', ')
		throw new expressError(message, 400)
	}
	next()
}

module.exports = validateNewUser