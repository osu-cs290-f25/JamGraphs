var express = require('express');
var app = express();
var session = require('express-session');
var post = require('./utils/post');
var account = require('./utils/account');
var spotifyAPI = require('./utils/spotifyAPI');
var fs = require('fs');
var path = require('path');

app.set("view engine", 'ejs');
app.use('/chart.js', express.static('node_modules/chart.js/dist'));
app.use(express.static('public'));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(session({
  secret: 'random-secret',
  resave: false,
  saveUninitialized: false, //not sure what this is for but cant run wout it
  cookie: {
    sameSite: "lax"
  }
}));
/*session {
    spotify_id,
    state,
    access_token,
    refresh_token,
    token_expires_in,
    token_timestamp
  }
*/

app.use(async function(req, res, next) {
  res.locals.session = req.session; // session data now available in ejs templates

  const now = Date.now() / 1000;

  if(req.session) {
    if(req.session.token_timestamp && req.session.token_expires_in) {
      if(now - req.session.token_timestamp > req.session.token_expires_in) {
        await spotifyAPI.refreshToken(req, res).catch(err => {
          console.error(err);
          // continue even if token refresh fails
        });
      }
    }
  }

  next();
});

app.get('/login', function(req, res) { 
  spotifyAPI.login(req, res); 
});

app.get('/logout', function(req, res){
  if (req.session) {
    req.session.destroy(function(error) {
      if (error) {
          console.error("Error destroying session:", error);
          return res.status(500).send("Failed to log out");
      }

      res.clearCookie('connect.sid', {
          path: '/',
          httpOnly: true,
          sameSite: 'lax'
      });

      res.redirect('/');
    });
  } else {
      res.redirect('/');
  }
})

app.get('/callback', async function(req, res) {
  try {
    await spotifyAPI.token(req, res);
    await spotifyAPI.updateUserAfterLogin(req, res);
  } catch(err) {
    console.error(err);
    return res.status(500).send("Internal Server Error");
  }
  res.status(200).redirect('/account');
});

app.get("/visualizations", async function(req, res) {
  if(req.session && req.session.access_token) {
    res.status(200).redirect("visualizations.html");
  } else {
    res.status(200).redirect("/?notLoggedInAlert=true");
  }
})

app.get('/account', function(req, res) {
  if(req.session && req.session.access_token) {
      var user = account.getUser(req.session.spotify_id);
    var posts = post.getPosts(req.session.spotify_id);
    res.status(200).render('accountPage', {
      user: user,
      posts: posts
    });
  } else {
    res.status(200).redirect("/?notLoggedInAlert=true");
  }
})

//Get all posts via exported function from utils/post/index.js
//Render feed.ejs with posts data
app.get('/feed', function(req, res) {
  var posts = post.getAllPosts();
  res.status(200).render('feed', {
    posts: posts
  });
})

app.get("/api/loggedIn", function(req, res) {
    if (req.session && req.session.access_token) {
        res.status(200).json(true);
    } else {
        res.status(200).json(false);
    }
})
//API call for visualizations data
// Fetches 50 items by default for artists and tracks
//Fetches 1000 items for genres distribution for better chart
app.get('/api/spotify/data', async function(req, res) {
    if (!req.session || !req.session.access_token) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const type = req.query.type; 
    const timeRange = req.query.time_range || 'long_term';

    let spotifyType = 'tracks';
    let fetchLimit = 50; 

    if (type === 'top-artists') {
        spotifyType = 'artists';
        fetchLimit = 50;
    } else if (type === 'genres-distribution') {
        spotifyType = 'artists';
        fetchLimit = 1000;
    }

    try {
        const data = await spotifyAPI.fetchTopItems(
            req, 
            res, 
            req.session.access_token, 
            spotifyType, 
            timeRange, 
            fetchLimit
        );
        res.status(200).json(data);
    } catch (err) {
        console.error("Error fetching Spotify data:", err);
        res.status(500).json({ error: "Failed to fetch data" });
    }
});

app.get('/api/user/profile', function(req, res) {
    if (req.session && req.session.spotify_id) {
        const user = account.getUser(req.session.spotify_id);
        if (user) {
            return res.status(200).json(user);
        }
    }
    res.status(404).json({ error: "User not found" });
});

// Share visualization post
app.post('/api/share', function(req, res) {
    if (!req.session || !req.session.access_token) {
        return res.status(401).json({ error: "Not logged in" });
    }

    const imgData = req.body.imgData;
    const description = req.body.description || "My Music Visualization";
    const userId = req.session.spotify_id;

    if (!imgData) return res.status(400).json({ error: "No image data" });

    const base64Data = imgData.replace(/^data:image\/png;base64,/, "");
    const filename = `post_${Date.now()}_${userId}.png`;
    const uploadPath = path.join(__dirname, 'public', 'images', 'posts', filename);
    const publicUrl = `images/posts/${filename}`;

    fs.writeFile(uploadPath, base64Data, 'base64', function(err) {
        if (err) {
            console.error("Error saving image:", err);
            return res.status(500).json({ error: "Failed to save image" });
        }

        try {
            post.createPost(userId, publicUrl, description);
            console.log("New post created for user:", userId);
            res.status(200).json({ success: true, url: publicUrl });
        } catch (dbErr) {
            console.error("Error updating DB:", dbErr);
            res.status(500).json({ error: "Failed to update database" });
        }
    });
});

app.listen(8000, function () {
  console.log("== Server is listening on port 8000");
});