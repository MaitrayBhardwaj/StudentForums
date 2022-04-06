require('dotenv').config()

const express = require('express')
const path = require('path')
const ejsMate = require('ejs-mate')
const mongoose = require('mongoose')
const methodOverride = require('method-override')
const session = require('express-session')
const flash = require('connect-flash')
const passport = require('passport')
const passportLocal = require('passport-local')
const mongoSanitize = require('express-mongo-sanitize')
const helmet = require('helmet')
const mongoStore = require('connect-mongo')

const Thread = require('./models/threads')
const Post = require('./models/posts')
const User = require('./models/users')
const Category = require('./models/categories')

const wrapAsync = require('./utils/wrapAsync')
const validateNewThread = require('./utils/validateNewThread')
const validateNewPost = require('./utils/validateNewPost')
const validateNewUser = require('./utils/validateNewUser')
const expressError = require('./utils/expressError')

const dbUrlProd = process.env.dbUrl
const dbUrlDev = 'mongodb://localhost:27017/StuFor'

const dbUrl = dbUrlProd

mongoose.connect(dbUrl)
	.then(() => {
		console.log('Connected to the database')
	})
	.catch(err => {
		console.log("Couldn't establish a connection to the database")
	})

const app = express()

const store = mongoStore.create({
	mongoUrl: dbUrl,
	secret: process.env.sessionSecret,
	touchAfter: 24 * 3600
})

store.on('error', (err) => {
	console.log('Session error', err)
})

app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, '/public')))
app.use(express.urlencoded({ extended: true }))
app.use(flash())
app.use(session({
	secret: process.env.sessionSecret,
	resave: false,
	saveUninitialized: true,
	store,
	cookie: {
		httpOnly: true,
		// secure: true,
		expires: Date.now() + 1000 * 60 * 60 * 24 * 14,
		maxAge: 1000 * 60 * 60 * 24 * 14
	}
}))

app.use(helmet({ contentSecurityPolicy: false }))
app.use(mongoSanitize())
app.use(passport.initialize())
app.use(passport.session())
app.use((req, res, next) => {
	res.locals.user = req.user
	res.locals.success = req.flash('success')
	res.locals.error = req.flash('error')
	res.locals.warning = req.flash('warning')
	res.locals.info = req.flash('info')
	next()
})


const isLoggedIn = (req, res, next) => {
	if(!req.isAuthenticated()){
		req.session.returnTo = req.originalUrl
		req.flash('error', 'You must be logged in to access that!')
		return res.redirect('/login')
	}
	else{
		next()
	}
}

app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

passport.use(new passportLocal(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

const allCategories = ['General Discussion', 'Doubt Solving', 'Consultation', 'Resources', 'Support', 'Miscellaneous']

app.get('/', wrapAsync(async (req, res, next) => {
	const categories = await Category.find({}).select('-recThreads')
	const recThreads = await Thread.find({}).sort({ lastModified: -1 }).populate('posts').limit(5).select('title posts _id lastModified').lean()
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
	res.render('home', { recThreads, popThreads, categories, pageTitle: 'StuFor - Where Students Gather' })
}))

app.get('/thread/:tID/post/:id/edit', isLoggedIn, wrapAsync(async (req, res, next) => {
	const { posts } = await Thread.findById(req.params.tID).populate('posts').select('posts')
	const [ post ] = posts.filter(e => e._id.equals(req.params.id))
	if(req.user._id.equals(post.author)){
		return res.render('editPost', { tID: req.params.tID, post, pageTitle: `Editing your post` })
	}
	else{
		req.flash('error', 'Slow down there, buddy! You can only edit your stuff.')
		res.redirect(`/thread/${req.params.tID}`)
	}
}))

app.get('/thread/:id', wrapAsync(async (req, res, next) => {
	const thread = await Thread.findById(req.params.id).populate('posts').select('title posts').lean()
	if(!thread){
		return next(new expressError("Page Not Found", 404))
	}
	res.render('thread', { thread, pageTitle: `${thread.title}` })
}))

app.post('/thread/:id', isLoggedIn, validateNewPost, wrapAsync(async (req, res, next) => {
	const user = req.user
	const newPost = new Post(req.body)
	const thread = await Thread.findById(req.params.id).select('lastModified posts _id')
	newPost.parentThread = thread._id
	newPost.author = user
	newPost.authorName = user.username
	newPost.createdAt = Date.now()
	await newPost.save()
	const poster = await User.findById(user._id).select('postCount')
	poster.postCount = poster.postCount + 1
	await poster.save()
	thread.lastModified = Date.now()
	thread.posts.push(newPost)
	await thread.save()
	req.flash('success', 'Added new post successfully!')
	res.redirect(`/thread/${thread._id}`)
}))

app.get('/category/:catName', wrapAsync(async (req, res, next) => {
	const { catName } = req.params
	const category = await Category.findOne({ name: catName })
	const threads = await Thread.find({ category: catName }).sort({ lastModified: -1 }).limit(10).select('title posts _id lastModified OPName').lean()
	res.render('category', { category, threads, pageTitle: `Browsing ${catName}` })
}))

app.get('/category/:catName/new', wrapAsync(async (req, res, next) => {
	const catName = req.params.catName
	if(!allCategories.includes(catName)){
		return next(new expressError("Page Not Found", 404))
	}
	res.render('newThread', { catName, pageTitle: `Add a Thread in ${catName}` })
}))

app.post('/category/:catName/new', isLoggedIn, validateNewThread, wrapAsync(async (req, res, next) => {
	const catName = req.params.catName
	if(!allCategories.includes(catName)){
		return next(new expressError("Page Not Found", 404))
	}

	const user = req.user;
	const { title, postContent } = req.body
	const newThread = new Thread({ title, OP: user, OPName: user.username })
	const newPost = new Post({ postContent, author: user, authorName: user.username })
	newThread.lastModified = Date.now()
	newThread.createdAt = Date.now()
	newPost.createdAt = Date.now()
	newThread.category = catName
	newPost.parentThread = newThread
	await newThread.save()
	try{
		await newPost.save()
	}
	catch(err){
		await newThread.remove()
		req.flash('error', 'Internal server error. Please try later.')
		res.redirect(`/category/${catName}/new`)
	}
	const poster = await User.findById(user._id).select('postCount')
	poster.postCount = poster.postCount + 1
	await poster.save()
	newThread.posts.push(newPost)
	await newThread.save()
	req.flash('success', 'New thread created successfully!')
	res.redirect(`/thread/${newThread._id}`)
}))

app.get('/search', wrapAsync(async (req, res, next) => {
	const { q = '', user } = req.query
	const regex = new RegExp(q, 'i')
	let results = []
	if(!user){
		results = await Thread.find({ "title": { $regex : regex } }).select('title posts _id createdAt OPName').lean()
	}
	else{
		results = await Thread.find({ "title": { $regex : regex}, "OPName": user}).select('title posts _id createdAt OPName').lean()
	}
	res.render('search', { results, q, user, pageTitle: `Search - Forums` })
}))

app.get('/signup', (req, res) => {
	res.render('register', { pageTitle: 'Sign Up' })
})

app.get('/login', (req, res) => {
	res.render('login', { pageTitle: 'Login' })
})

app.post('/signup', validateNewUser, wrapAsync(async (req, res, next) => {
	const { username, email, password } = req.body
	const user = new User({ username, email })
	try{
		const newUser = await User.register(user, password)
		req.login(newUser, err => {
			if(err) return next(err);
			req.flash('success', 'Successfully signed up on StuFor!')
			res.redirect('/')
		})
	}
	catch(err) {
		req.flash('error', err.message)
		res.redirect('/signup')
	}
}))

app.patch('/thread/:tid/post/:id', isLoggedIn, wrapAsync(async (req, res, next) => {
	const post = await Post.findById(req.params.id)
	if(req.user._id.equals(post.author)){
		post.postContent = req.body.postContent
		const modif = Date.now()
		if(modif - post.createdAt >= (1000 * 60 * 2)){
			post.modifiedAt = modif
		}
		await post.save()
		req.flash('success', 'Post edited successfully!')
	}
	else{
		req.flash('error', 'You cannot edit the post which does not belong to you!')
	}
	res.redirect(`/thread/${req.params.tid}`)
}))

app.delete('/thread/:tid/post/:id', isLoggedIn, wrapAsync(async (req, res, next) => {
	const post = await Post.findById(req.params.id)
	if(post.author._id.equals(req.user._id)){
		await Post.findByIdAndDelete(req.params.id)
		req.flash('success', 'Successfully deleted your post!')
	}
	else{
		req.flash('error', `Slow down there! You are NOT allowed to do that.`)
	}
	res.redirect(`/thread/${req.params.tid}`)
}))

app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login'}), wrapAsync(async (req, res, next) => {
	const { username } = req.body
	const redirectTo = req.session.returnTo || '/'
	delete req.session.returnTo
	req.flash('success', `Welcome back, ${username}! Logged in successfully.`)
	res.redirect(redirectTo)
}))

app.get('/profile/:name', wrapAsync(async (req, res, next) => {
	const targetUser = await User.findOne({ username: req.params.name })
	if(!targetUser){
		return next(new expressError("No user with that username found.", 404))
	}
	res.render('profile', { targetUser, pageTitle: `${req.params.name}'s Profile` })
}))

app.get('/logout', isLoggedIn, (req, res) => {
	req.logout()
	req.flash('success', 'Logged out successfully!')
	res.redirect('/')
})

app.get('/profile/:username/edit', isLoggedIn, wrapAsync(async (req, res, next) => {
	const targetUser = await User.findOne({ username: req.params.username })
	if(targetUser._id.equals(req.user._id)){
		res.render('editProfile', { targetUser, pageTitle: 'Edit your profile' })
	}
	else{
		req.flash('error', 'Whoa! Slow down buddy. You can only edit your own profile.')
		res.redirect(`/profile/${req.params.username}`)
	}
}))

app.patch('/profile/:username', isLoggedIn, wrapAsync(async (req, res, next) => {
	const targetUser = await User.findOne({ username: req.params.username })
	if(targetUser._id.equals(req.user._id)){
		targetUser.aboutMe = req.body.aboutMe
		await targetUser.save()
		req.flash('success', 'Updated About Me successfully!')
	}
	else{
		req.flash('error', `You don't have the permissions to do that!`)
	}
	res.redirect(`/profile/${req.params.username}`)
}))

app.all('*', (req, res, next) => {
	next(new expressError("Page Not Found", 404))
})

app.use((err, req, res, next) => {
	const { status = 500, message } = err
	res.status(status).render('error', { message, status, pageTitle: `Error ${status}` })
})

app.listen(3000, () => {
	console.log('Connection active on Port 3000')
})