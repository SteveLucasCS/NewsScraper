var express = require('express')
var logger = require('morgan')
var mongoose = require('mongoose')
var axios = require('axios')
var cheerio = require('cheerio')
var db = require('./models')

var PORT = 3000

// Require all models

// Initialize Express
var app = express()

// Configure middleware
// Use morgan logger for logging requests
app.use(logger('dev'))
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
// Make public a static folder
app.use(express.static('public'))

var exphbs = require('express-handlebars')

app.engine(
  'handlebars',
  exphbs({
    defaultLayout: 'main'
  })
)
app.set('view engine', 'handlebars')

// Connect to the Mongo DB
// If deployed, use the deployed database. Otherwise use the local database
var MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost/NewsScraper_db'

mongoose.connect(
  MONGODB_URI,
  { useNewUrlParser: true }
)

app.get('/scrape', function (req, res) {
  axios.get('https://www.nytimes.com').then(function (response) {
    // Then, we load that into cheerio and save it to $ for a shorthand selector
    var $ = cheerio.load(response.data)

    // Now, we grab every h2 within an article tag, and do the following:
    $('article.css-8atqhb').each(function (i, element) {
      // Save an empty result object
      var result = {}

      var link = $(element).find('a')

      result.link = 'https://nytimes.com' + $(link).attr('href')

      result.title = $(link)
        .find('h2')
        .text()

      result.summary = $(link)
        .find('p')
        .text()

      result.image = $(link)
        .find('img')
        .attr('src')

      if (result.summary == '') {
        var list = $(link).find('ul')
        result.summary = $(list)
          .children('li')
          .text()
      }

      // Create a new Article using the `result` object built from scraping
      db.Article.create(result)
        .then(function (result) {
          // View the added result in the console
        })
        .catch(function (err) {
          // If an error occurred, log it
          console.log(err)
        })
    })

    // Send a message to the client
    res.send('Scrape Complete')
  })
})

// Creates a new comment and updates the Article and Comment collections
app.post('/articles/:id', function (req, res) {
  db.Comment.create(req.body)
    .then(function (dbComment) {
      return db.Article.findOneAndUpdate(
        { _id: req.params.id },
        { $push: { comments: dbComment._id } },
        { new: true }
      )
    })
    .then(function (dbArticle) {
      res.send(dbArticle)
    })
    .catch(function (err) {
      console.log(err)
    })
})

// Route for grabbing a specific Article by id, populate it with it's comments
app.get('/articles/:id', function (req, res) {
  // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
  db.Article.findOne({ _id: req.params.id })
    // ..and populate all of the notes associated with it
    .populate('comments')
    .then(function (dbArticle) {
      // If we were able to successfully find an Article with the given id, send it back to the client

      res.json(dbArticle)
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err)
    })
})

app.get('/search/:keyword', function (req, res) {
  db.Article.find({ 'title': { $regex: req.params.keyword, $options: 'i'} })
    .then(function (dbArticle) {
      console.log(dbArticle)
      res.render('search', { data: dbArticle })
    })
    .catch(function (err) {
      console.log(err)
    })
})

app.get('/', function (req, res) {
  // Get all articles from the database
  db.Article.find({})
    .then(function (dbArticle) {
      // res.json(dbArticle)
      // console.log(dbArticle)
      data = dbArticle
      res.render('articles', { data: dbArticle })
    })
    .catch(function (err) {
      // If an error occurred, send it to the client
      res.json(err)
    })
})

// Start the server
app.listen(PORT, function () {
  console.log('App running on port ' + PORT + '!')
})
