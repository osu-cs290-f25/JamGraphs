var express = require('express')
var app = express()

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))
var session = require('express-session')
var querystring = require('querystring')
var post = require('post')
var account = require('account') /*
                                    methods {
                                        userExists(userId)
                                        newUser(userId, refreshToken)
                                        getUser(userId)
                                        updateRefreshToken(userId, refreshToken)
                                    }
                                */

app.set("view engine", 'ejs')

app.use(express.static('public'))


//spotify login route
var client_id = '0ef3e0750fd94db79804a645ca247f1b'
var redirect_uri = 'http://127.0.0.1:8000/callback'
var client_secret = 'fd6e18de464142c28df7194022d82907'

function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

app.use(session({
  secret: 'random-secret',
  resave: false,
  saveUninitialized: true //not sure what this is for but cant run wout it
}));

app.get('/login', function(req, res) {
  var state = generateRandomString(16);
  req.session.state = state;
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});

app.get('/callback', async function(req, res) {
  var code = req.query.code || null
  var state = req.query.state || null

  if (state === null || state !== req.session.state) {
    return res.status(400).send('State mismatch')
  }

  req.session.state = null

  try {
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: querystring.stringify({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      })
    })

    const tokenData = await tokenRes.json()
    console.log(tokenData)

    req.session.access_token = tokenData.access_token;
    req.session.refresh_token = tokenData.refresh_token;

    const profileRes = await fetch('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + tokenData.access_token }
    });

    const profileData = await profileRes.json()
    req.session.userId = profileData.id


    if (account.userExists(req.session.userId)) {
        account.updateRefreshToken(req.session.userId, req.session.refresh_token)
    } else {
        account.newUser(req.session.userId, req.session.refresh_token)
    }
    account.newUser(req.session.userId, req.session.refresh_token)

    res.redirect('account.html') //since userId exists, should render account
  } catch (err) {
    console.error(err)
    res.status(500).send('Error during token exchange or fetching profile');
  }
});

/*Session data structure
   session {
    userId,
    access_token,
    refresh_token
   }
*/



app.listen(8000, function () {
  console.log("== Server is listening on port 8000")
})