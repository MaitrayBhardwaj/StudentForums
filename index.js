const express = require('express')
const path = require('path')
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const methodOverride = require('method-override')

const Thread = require('./models/threads')
const Post = require('./models/posts')
const User = require('./models/users')
const Category = require('./models/categories')

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

app.get('/', wrapAsync(async (req, res, next) => {
	const categories = await Category.find({})
	const recThreads = await Thread.find({}).sort({ lastModified: -1 }).limit(5)
	const popThreads = await Thread.aggregate(
	    [
	        { "$project": {
	            "title": 1,
	            "createdAt": 1,
	            "lastModified": 1,
	            "posts": 1,
	            "OPName": 1,
	            "length": { "$size": "$posts" }
	        }},
	        { "$sort": { "length": -1 } },
	        { "$limit": 5 }
	    ],
	    (err,results) => {
	    	return results
	    }
	)
	res.render('home', { recThreads, popThreads, categories })
}))

app.get('/thread/:id', wrapAsync(async (req, res, next) => {
	const thread = await Thread.findById(req.params.id)
	const { posts } = await thread.populate('posts')
	res.render('thread', { thread, posts })
}))

app.post('/thread/:id', wrapAsync(async (req, res, next) => {
	const newPost = new Post(req.body)
	const thread = await Thread.findById(req.params.id)
	newPost.parentThread = thread
	await newPost.save()
	thread.lastModified = Date.now()
	thread.posts.push(newPost)
	await thread.save()
	res.redirect(`/thread/${thread._id}`)
}))

app.get('/category/:catName', wrapAsync(async (req, res, next) => {
	const { catName } = req.params
	const category = await Category.findOne({ name: catName })
	const threads = await Thread.find({ category: catName }).sort({ lastModified: -1 }).limit(10)
	res.render('category', { category, threads })
}))

app.get('/category/:catName/new', wrapAsync(async (req, res, next) => {
	const category = await Category.findOne({ name: req.params.catName })
	res.render('newThread', { category })
}))

app.post('/category/:catName/new', wrapAsync(async (req, res, next) => {
	const category = await Category.findOne({ name: req.params.catName })
	const { title, postContent } = req.body
	const newThread = new Thread({ title })
	const newPost = new Post({ postContent })
	newThread.lastModified = Date.now()
	newThread.createdAt = Date.now()
	newThread.category = req.params.catName
	await newThread.save()
	newPost.parentThread = newThread
	try{
		await newPost.save()
	}
	catch(err){
		await Thread.findByIdAndDelete(newThread._id)
		res.redirect(`/category/${req.params.catName}/new`)
	}
	newThread.posts.push(newPost)
	await newThread.save()
	res.redirect(`/thread/${newThread._id}`)
}))

app.get('/search', wrapAsync(async (req, res, next) => {
	const { q } = req.query
	const regex = new RegExp(q, 'i')
	const results = await Thread.find({ "title": { $regex : regex } })
	res.render('search', { results, q})
}))

app.use((err, req, res, next) => {
	const status = err.status || 500
	res.status(status).send(err.message)
})

app.listen(3000, () => {
	console.log('Connection active on Port 3000')
})