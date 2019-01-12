/**
 * Schema for Article collection (class) in the db
 */
var mongoose = require('mongoose')

// Save a reference to the Schema constructor
var Schema = mongoose.Schema

// Using the Schema constructor, create a new UserSchema object
// This is similar to a Sequelize model
var ArticleSchema = new Schema({
  // `title` is required and of type String
  title: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: false
  },
  // `link` is required and of type String
  link: {
    type: String,
    required: true
  },
  image: {
    type: String,
    required: false
  },
  // Array of comments linked to the article by their object IDs
  comments: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }]
})

// This creates our model from the above schema, using mongoose's model method
var Article = mongoose.model('Article', ArticleSchema)

// Export the Article model
module.exports = Article
