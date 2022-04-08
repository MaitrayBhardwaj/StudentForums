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
const nodemailer = require('nodemailer')

const Thread = require('./models/threads')
const Post = require('./models/posts')
const User = require('./models/users')
const Category = require('./models/categories')
const DelLogs = require('./models/delLogs')
const UserVerification = require('./models/userVerification')

const wrapAsync = require('./utils/wrapAsync')
const validateNewThread = require('./utils/validateNewThread')
const validateNewPost = require('./utils/validateNewPost')
const validateNewUser = require('./utils/validateNewUser')
const expressError = require('./utils/expressError')

const dbUrlProd = process.env.dbUrl
const dbUrlDev = 'mongodb://localhost:27017/StuFor'

const dbUrl = dbUrlProd || dbUrlDev

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

const isAdmin = async (req, res, next) => {
	const isAdmin = await User.findById(req.user._id).select('isAdmin').lean()
	req.user.isAdmin = isAdmin
	next()
}

app.engine('ejs', ejsMate)
app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

passport.use(new passportLocal(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

const transporter = nodemailer.createTransport({
	host: 'smtp.gmail.com',
	auth: {
		user: process.env.mailID,
		pass: process.env.mailPass
	}
})

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

app.get('/thread/:id', isAdmin, wrapAsync(async (req, res, next) => {
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
	if(!req.user){
		res.render('register', { pageTitle: 'Sign Up' })
	}
	else{
		req.flash('success', 'You are already signed up.')
		res.redirect('/')
	}
})

app.get('/login', (req, res) => {
	if(!req.user){
		res.render('login', { pageTitle: 'Login' })
	}
	else{
		req.flash('success', "You are already logged in.")
		res.redirect('/')
	}
})

app.post('/signup', validateNewUser, wrapAsync(async (req, res, next) => {
	const { username, email, password } = req.body
	const user = new User({ username, email })
	try{
		const OTP = Math.floor((Math.random() * 9000) + 1000)
		const mailOptions = {
			from: process.env.mailID,
			to: email,
			subject: "Verify your account on StuFor",
			html: `<p>Your OTP is <b>${OTP}</b>. Enter it when you are prompted to verify your account. <br> This OTP will expire in <b>1 hour</b> from now.</p>`
		}
		const userVer = new UserVerification({
			uid: user._id,
			OTP,
			createdAt: Date.now(),
			expires: Date.now() + 1000 * 60 * 60
		})
		await userVer.save()
		await transporter.sendMail(mailOptions)
		req.session.unverifiedUser = user
		req.session.unverifiedUserPass = password
		res.redirect('/verify')
	}
	catch(err) {
		req.flash('error', err.message)
		res.redirect('/signup')
	}
}))

app.get('/verify', (req, res) => {
	res.render('verify', { pageTitle: 'Verify Your Account' })
})

app.get('/resend', wrapAsync(async (req, res, next) => {
	const OTP = Math.floor((Math.random() * 9000) + 1000)
	const { unverifiedUser } = req.session
	const userLog = await UserVerification.findOne({ uid: unverifiedUser._id })
	if(!userLog){
		const userVer = new UserVerification({
			uid: unverifiedUser.email,
			OTP,
			createdAt: Date.now(),
			expires: Date.now() + 1000 * 60 * 60
		})
		await userVer.save()
	}
	else{
		userLog.OTP = OTP
		userLog.createdAt = Date.now()
		userLog.expires = Date.now() + 1000 * 60 * 60 
		await userLog.save()
	}
	const mailOptions = {
		from: process.env.mailID,
		to: unverifiedUser.email,
		subject: "Verify your account on StuFor",
		html: `<p>Your OTP is <b>${OTP}</b>. Enter it when you are prompted to verify your account. <br> This OTP will expire in <b>1 hour</b> from now.</p>`
	}
	await transporter.sendMail(mailOptions)
	res.redirect('/verify')
}))

app.post('/verify', wrapAsync(async (req, res, next) => {
	const OTPEntered = req.body.OTP
	const { unverifiedUser, unverifiedUserPass } = req.session
	const unVerified = await UserVerification.findOne({ uid: unverifiedUser._id })
	const unVerifiedUser = new User(unverifiedUser)
	const { OTP } = unVerified
	if(unVerified.expires < Date.now()){
		await unVerified.remove()
		req.flash('error', 'Time out! This OTP has expired. Get a different one.')
		res.redirect('/signup')
	}
	else if(OTP === OTPEntered){
		unverifiedUser.isVerified = true
		console.dir(unVerified)
		console.dir(unVerifiedUser)
		const newUser = await User.register(unVerifiedUser, unverifiedUserPass)
		await unVerified.remove()
		req.login(newUser, err => {
			if(err) return next(err);
			delete req.session.unverifiedUser
			delete req.session.unverifiedUserPass
			req.flash('success', 'Successfully signed up on StuFor!')
			res.redirect('/')
		})
	}
	else{
		req.flash('error', 'Wrong OTP entered. Please try again.')
		res.redirect('/verify')
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

app.delete('/thread/:tid/post/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res, next) => {
	const post = await Post.findById(req.params.id)
	if(post.author._id.equals(req.user._id)){
		await post.remove()
		req.flash('success', 'Successfully deleted your post!')
	}
	else if(req.user.isAdmin){
		if(!req.body.delReason){
			return res.render('delReasonPost', { pageTitle: "Reason for deletion", tid: req.params.tid, pid: req.params.id})
		}
		else{
			const delLog = new DelLogs({
				id: post._id,
				reason: req.body.delReason
			})
			await delLog.save()
			await post.remove()
			req.flash('success', 'Successfully deleted the specified post!')
		}
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

app.delete('/thread/:id', isLoggedIn, isAdmin, wrapAsync(async (req, res, next) => {
	const thread = await Thread.findById(req.params.id)
	if(req.user.isAdmin){
		if(!req.body.delReason){
			return res.render('delReasonThread', { pageTitle: "Reason for deletion", tid: req.params.id })
		}
		else{
			const delLog = new DelLogs({
				id: thread._id,
				reason: req.body.delReason
			})
			await delLog.save()
			await thread.remove()
			req.flash('success', 'Successfully deleted the specified thread.')
			res.redirect('/')
		}
	}
	else{
		req.flash('error', 'You are NOT allowed to do that!')
		res.redirect(`/thread/${req.params.id}`)
	}
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

const port = process.env.PORT || 3000

app.listen(port, () => {
	console.log(`Connection active on Port ${port}`)
})