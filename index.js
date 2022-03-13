const express = require('express')
const path = require('path')
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const Thread = require('./models/threads')
const Post = require('./models/posts')
const User = require('./models/users')

mongoose.connect('mongodb://localhost:27017/StuFor')
	.then(() => {
		console.log('Connected to the database')
	})
	.catch(err => {
		console.log("Couldn't establish a connection to the database")
	})

const app = express()

app.use(express.static(path.join(__dirname, '/public')))

app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

const categories = ['General Discussion', 'Resources', 'Doubt Solving', 'Consultation', 'Miscellaneous', 'Support']

app.get('/', (req, res) => {
	res.render('home', { categories, recThreads, popThreads })
})

app.get('/thread/:id', (req, res) => {
	res.render('thread', { thread, posts })
})

app.post('/thread/:id/new', (req, res) => {
	
})

app.listen(3000, () => {
	console.log('Connection active on Port 3000')
})