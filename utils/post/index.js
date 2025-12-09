var fs = require('fs')
var path = require('path')

var filePath = path.join(__dirname, "../..", 'postsData.json')

function readPosts() {
  if (!fs.existsSync(filePath)) 
    return []
  var data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

function writePosts(posts) {
  fs.writeFileSync(filePath, JSON.stringify(posts, null, 2));
}


module.exports = {
    getPosts: function(id) {
        var posts = readPosts();
        var userPosts = [];

        for(var i = 0; i < posts.length; i++) {
            if(posts[i].id == id) {
                userPosts.push(posts[i]);
            }
        }

        return userPosts;
    },
    getAllPosts: function() {
        return readPosts();
    },
    createPost: function(userId, imgUrl, description) {
        var posts = readPosts();
        
        var maxId = 0;
        posts.forEach(p => { if(p['post-id'] > maxId) maxId = p['post-id']; });
        
        var newPost = {
            "post-id": maxId + 1,
            "id": userId,
            "imgUrl": imgUrl,
            "dateUploaded": new Date().toISOString(),
            "description": description,
            "numLikes": 0
        };

        posts.push(newPost);
        writePosts(posts);
        return newPost;
      },
    
  deletePost: function(postId) {
    var posts = readPosts();

    console.log(typeof postId);

    console.log(`Post ${postId}`);
    posts = posts.filter(function(post) { 
        return post["post-id"] !== Number(postId);
    });

    writePosts(posts);
  }
}