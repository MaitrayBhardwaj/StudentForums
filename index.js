const express = require('express')
const path = require('path')
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const methodOverride = require('method-override')

const Thread = require('./models/threads')
const Post = require('./models/posts')
const User = require('./models/users')

const wrapAsync = require('./utils/wrapAsync')

mongoose.connect('mongodb://localhost:27017/StuFor')
	.then(() => {
		console.log('Connected to the database')
	})
	.catch(err => {
		console.log("Couldn't establish a connection to the database")
	})

const app = express()

app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.urlencoded({ extended: true }))

app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

const categories = ['General Discussion', 'Resources', 'Doubt Solving', 'Consultation', 'Miscellaneous', 'Support']

app.get('/', wrapAsync(async (req, res, next) => {
	const recThreads = await Thread.find({})
	res.render('home', { recThreads, categories })
}))

app.get('/thread/:id', wrapAsync(async (req, res, next) => {
	const thread = await Thread.findById(req.params.id)
	const { posts } = await thread.populate('posts')
	res.render('thread', { thread, posts })
}))

app.post('/thread/:id', wrapAsync(async (req, res, next) => {
	const newPost = new Post(req.body)
	console.dir(req.body)
	const thread = await Thread.findById(req.params.id)
	newPost.parentThread = thread
	await newPost.save()
	thread.posts.push(newPost)
	await thread.save()
	res.redirect(`/thread/${thread._id}`)
}))

app.use((err, req, res, next) => {
	const status = err.status || 500
	res.status(status).send(err.message)
})

app.listen(3000, () => {
	console.log('Connection active on Port 3000')
})