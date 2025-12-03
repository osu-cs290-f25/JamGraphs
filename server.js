var express = require('express');
var app = express();
var session = require('express-session');
var post = require('post');
var account = require('account');
var spotifyAPI = require('spotifyAPI');

app.set("view engine", 'ejs');

app.use(express.static('public'));

app.use(session({
  secret: 'random-secret',
  resave: false,
  saveUninitialized: true //not sure what this is for but cant run wout it
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
  if(!(req.session && req.session.access_token)) {
    res.status(200).redirect("/?notLoggedInAlert=true");
  }

  var user = account.getUser(req.session.spotify_id);
  var posts = post.getPosts(req.session.spotify_id);
  res.status(200).render('accountPage', {
    user: user,
    posts: posts
  });
})

app.get("/api/loggedIn", function(req, res) {
    if (req.session && req.session.access_token) {
        res.status(200).json(true);
    } else {
        res.status(200).json(false);
    }
});

app.listen(8000, function () {
  console.log("== Server is listening on port 8000");
});