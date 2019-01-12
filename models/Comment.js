/**
 * Schema for Comments collection in DB
 */
var mongoose = require('mongoose')

// Save a reference to the Schema constructor
var Schema = mongoose.Schema

// Using the Schema constructor, create a new UserSchema object
// This is similar to a Sequelize model
var CommentSchema = new Schema({
  author: {
    type: String,
    required: false,
    default: 'Anonymous'
  },
  body: {
    type: String,
    required: true
  }
})

// This creates our model from the above schema, using mongoose's model method
var Comment = mongoose.model('Comment', CommentSchema)

// Export the Article model
module.exports = Comment
