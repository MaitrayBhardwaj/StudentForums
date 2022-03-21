const mongoose = require('mongoose')
const Category = require('../models/categories')

mongoose.connect('mongodb://localhost:27017/StuFor')
	.then(() => {
		console.log('Connected to the database')
	})
	.catch(() => {
		console.log('Unable to connect to the database')
	})

const categories = ['General Discussion', 'Resources', 'Doubt Solving', 'Consultation', 'Miscellaneous', 'Support']
const desc = [
	`This is a place for the topics which are not strictly specific to a single category. The topics here contain various different ideas.`,
	`Looking for resources to back you up? Ask it out here!`,
	`Stuck somewhere? Use this board to clear your doubts!`,
	`Use this board to get some advice from other users. Be it career advice, financial advice, ask it out here!`,
	`Not sure which category your topic belongs to? Add it here!`,
	`Having problems with the site? Report right here.`
]

const fillCat = async () => {
	for(let i = 0; i < categories.length; i++){
		await Category.insertMany([{
			name: categories[i],
			desc: desc[i]
		}])
	}
}

fillCat()