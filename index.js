const express = require('express')
const path = require('path')

const app = express()

app.use(express.static(path.join(__dirname, '/public')))

app.set('views', path.join(__dirname, '/views'))
app.set('view engine', 'ejs')

app.get('/', (req, res) => {
	res.render('home')
})

app.listen(3000, () => {
	console.log('Connection active on Port 3000')
})