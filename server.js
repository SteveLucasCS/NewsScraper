var express = require('express');
var logger = require('morgan');
var mongoose = require('mongoose');
var axios = require('axios');
var cheerio = require('cheerio');
var db = require('./models');

var PORT = process.env.PORT || 3000;

// Require all models

// Initialize Express
var app = express();

// Configure middleware
// Use morgan logger for logging requests
app.use(logger('dev'));
// Parse request body as JSON
app.use(
	express.urlencoded({
		extended: true
	})
);
app.use(express.json());
// Make public a static folder
app.use(express.static('public'));

var exphbs = require('express-handlebars');

app.engine(
	'handlebars',
	exphbs({
		defaultLayout: 'main'
	})
);
app.set('view engine', 'handlebars');

// Connect to the Mongo DB
// If deployed, use the deployed database. Otherwise use the local database
var MONGODB_URI =
	process.env.MONGODB_URI || 'mongodb://localhost/NewsScraper_db';

mongoose.connect(MONGODB_URI, {
	useNewUrlParser: true
});

app.get('/scrape', function (req, res) {
	/**
   * Scrapes news sources and updates the Articles collection, only adding
   * documents if here are no documents with the same title in the db already.
   * @param {Function} callback Callback function ran after scraping
   */
	function scrapeAndUpdate (callback) {
		// Scrape NY Times Homepage
		axios.get('https://www.nytimes.com').then(function (response) {
			// Then, we load that into cheerio and save it to $ for a shorthand selector
			var $ = cheerio.load(response.data);

			// Now, we grab every h2 within an article tag, and do the following:
			$('article.css-8atqhb').each(function (i, div) {
				// Save an empty result object
				var article = {};

				var link = $(div).find('a');

				article.link = 'https://nytimes.com' + $(link).attr('href');

				article.title = $(link).find('h2').text();

				article.summary = $(link).find('p').text();

				article.image = $(link).find('img').attr('src');

				// Some NY Times articles have their summaries as lists
				if (article.summary === '') {
					var list = $(link).find('ul');
					article.summary = $(list).children('li').text();
				}

				if (article.title) {
					// Create a new Article in DB unless one with a matching title exists
					db.Article.find({ title: article.title }, function (err, matches) {
						if (err) {
							console.log(err);
						}
						if (matches.length === 0) {
							db.Article
								.create(article)
								.then(function (result) {
									addedFromTimes++;
								})
								.catch(function (err) {
									// If an error occurred, log it
									console.log(err);
								});
						}
					});
				}
			});
		});

		// Scrape Washington Post Homepage
		axios
			.get('https://www.washingtonpost.com/?noredirect=on&reload=true')
			.then(function (response) {
				var $ = cheerio.load(response.data);
				$('.moat-trackable').each(function (i, div) {
					if ($(div).data('feature-id') === 'homepage/story-ans') {
						var title = $(div).find('.headline').find('a').text();
						var summary = $(div).find('.blurb').text();
						var link = $(div).find('a').attr('href');
						var image = $(div).find('img').attr('src');

						if (title) {
							var article = {
								title: title,
								summary: summary,
								link: link,
								image: image
							};

							// Create a new Article in DB unless one with a matching title exists
							db.Article.find({ title: article.title }, function (
								err,
								matches
							) {
								if (err) {
									console.log(err);
								}
								if (!matches) {
									db.Article
										.create(article)
										.then(function (result) {
											addedFromWaPo++;
										})
										.catch(function (err) {
											// If an error occurred, log it
											console.log(err);
										});
								} else {
									console.log('article already in DB; ' + matches.length);
								}
							});
						}
					}
				});
			});

		// Scrape Reddit r/news page
		axios.get('https://www.reddit.com/r/news/').then(function (response) {
			var $ = cheerio.load(response.data);

			$('.scrollerItem').each(function (div) {
				// Ad elements have this class as of current build
				var ads = $(div).children().find('.ngb5qd-0');

				var anchors = $(div).find('a');

				var title = '';
				var summary = '';
				var link = '';
				for (var a = 0; a < anchors.length; a++) {
					if ($(anchors[a]).data('click-id') === 'body') {
						title = $(anchors[a]).find('h2').text();
						//reddit post link
						summary = 'https://www.reddit.com/' + $(anchors[a]).attr('href');
						//external news link (originial article)
						link = $(anchors[a + 1]).attr('href');
						break;
					}
				}

				// Only add articles to the array if they aren't an ad and have a title
				if ($(ads) !== 'promoted' && title) {
					var article = {
						title: title,
						summary: summary,
						link: link,
						image: 'https://i.redd.it/rq36kl1xjxr01.png'
					};

					if (title) {
						var article = {
							title: title,
							summary: summary,
							link: link,
							image: image
						};

						// Create a new Article in DB unless one with a matching title exists
						db.Article.find({ title: article.title }, function (err, matches) {
							if (err) {
								console.log(err);
							}
							if (!matches) {
								db.Article
									.create(article)
									.then(function (result) {
										addedFromReddit++;
									})
									.catch(function (err) {
										// If an error occurred, log it
										console.log(err);
									});
							} else {
								console.log('article already in DB; ' + matches.length);
							}
						});
					}
				}
			});
		});
		callback();
	}
	scrapeAndUpdate(function () {
		res.send('Scraping NY Times, Washington Post, and Reddit/news');
	});
});

// Creates a new comment and updates the Article and Comment collections
app.post('/articles/:id', function (req, res) {
	db.Comment
		.create(req.body)
		.then(function (dbComment) {
			return db.Article.findOneAndUpdate(
				{
					_id: req.params.id
				},
				{
					$push: {
						comments: dbComment._id
					}
				},
				{
					new: true
				}
			);
		})
		.then(function (dbArticle) {
			res.send(dbArticle);
		})
		.catch(function (err) {
			console.log(err);
		});
});

// Route for grabbing a specific Article by id, populate it with it's comments
app.get('/articles/:id', function (req, res) {
	// Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
	db.Article
		.findOne({
			_id: req.params.id
		})
		// ..and populate all of the notes associated with it
		.populate('comments')
		.then(function (dbArticle) {
			// If we were able to successfully find an Article with the given id, send it back to the client

			res.json(dbArticle);
		})
		.catch(function (err) {
			// If an error occurred, send it to the client
			res.json(err);
		});
});

app.get('/search/:keyword', function (req, res) {
	db.Article
		.find({
			title: {
				$regex: req.params.keyword,
				$options: 'i'
			}
		})
		.then(function (dbArticle) {
			console.log(dbArticle);
			res.render('search', {
				data: dbArticle
			});
		})
		.catch(function (err) {
			console.log(err);
		});
});

app.get('/', function (req, res) {
	// Get all articles from the database
	db.Article
		.find({})
		.then(function (dbArticle) {
			// res.json(dbArticle)
			// console.log(dbArticle)
			data = dbArticle;
			res.render('articles', {
				data: dbArticle
			});
		})
		.catch(function (err) {
			// If an error occurred, send it to the client
			res.json(err);
		});
});

// Start the server
app.listen(PORT, function () {
	console.log('App running on port ' + PORT + '!');
});
