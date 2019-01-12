function showComments (index, comments) {
  $('#commentContainer' + index).html('')
  for (var i = 0; i < comments.length; i++) {
    var comment = $('<div>')
    $(comment).addClass('row comment px-0 border-bottom border-primary')

    var author = $('<h4>')
    $(author).css('font-size', '1.1em')
    $(author).addClass('text-primary w-100 m-0 pt-2 px-0 pb-0')
    $(author).text(comments[i].author)

    var body = $('<p>')
    $(body).addClass('w-100 m-0 py-0 px-2')
    $(body).text(comments[i].body)

    $(comment).append(author)
    $(comment).append(body)
    
    $('#commentContainer' + index).append(comment)
  }
}

$('.submitComment').on('click', function (event) {
  event.preventDefault()
  $('#errorMsg' + index).text('')

  var index = $(this).data('index')
  var articleId = $(this).data('articleid')
  var author = $('#username' + index).val()
  var body = $('#commentBody' + index).val()
  body = body.trim()
  if (!body) {
    $('#errorMsg' + index).text('Comment Cannot Be Empty!')
  }
  if (!author) {
    author = 'Anonymous'
  }

  $.ajax({
    method: 'POST',
    url: '/articles/' + articleId,
    data: {
      author: author,
      body: body,
      articleId: articleId
    }
  }).then(function (res) {
    if (res) {
      console.log(res)
      $('.dropdown').dropdown('hide')
      showComments(index, res.comments)
      
    } else {
      alert(
        'Your comment could not be saved. Please check your internet connection.'
      )
    }
  })
})

$('.showComments').on('click', function (event) {
  event.preventDefault()
  var index = $(this).data('index')
  $.ajax({
    method: 'GET',
    url: '/articles/' + $(this).data('articleid')
  }).then(function (res) {
    showComments(index, res.comments)
  })
})
