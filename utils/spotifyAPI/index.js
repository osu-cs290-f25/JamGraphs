const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
var querystring = require('querystring');
var account = require('../account');

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

module.exports = {
    login: function(req, res) {
        var state = generateRandomString(16);
        req.session.state = state;
        var scope = 'user-read-private user-read-email user-top-read';
        res.status(200).redirect('https://accounts.spotify.com/authorize?' +
            querystring.stringify({
                response_type: 'code',
                client_id: client_id,
                scope: scope,
                redirect_uri: redirect_uri,
                state: state,
                show_dialog: true
        }));
    },

    token: function(req, res) {
        var code = req.query.code || null;
        var state = req.query.state || null;
        var error = req.query.error || null;
        if (state === null || state !== req.session.state) {
            return res.status(400).send('State mismatch');
        } else if(error) {
            return res.status(400).send('Callback Error: ' + error);
        } else {
            return fetch('https://accounts.spotify.com/api/token', {
                method: 'POST',
                body: querystring.stringify({
                    code: code,
                    redirect_uri: redirect_uri,
                    grant_type: 'authorization_code'
                }),
                headers: {
                    'content-type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + (new Buffer.from(client_id + ':' + client_secret).toString('base64'))
                }
            }).then(function(tokenRes) {
                return tokenRes.json(); //wait for json parsing
            }).then(function(tokenData) {
                console.log(tokenData);
                const now = Date.now() / 1000; 

                req.session.access_token = tokenData.access_token;
                req.session.refresh_token = tokenData.refresh_token;
                req.session.token_expires_in = tokenData.expires_in; 
                req.session.token_timestamp = now;
            }).catch(function(err) {
                console.error(err);
                throw err;
            });
        }
    },

    updateUserAfterLogin: function(req, res) {
        return fetch('https://api.spotify.com/v1/me', {
            headers: { 
                'Authorization': 'Bearer ' + req.session.access_token 
            }
        }).then(function(profileRes) {
            return profileRes.json(); //wait for json parsing
        }).then(function(profileData) {
            req.session.spotify_id = profileData.id;
            if (account.userExists(profileData.id)) {
                console.log("==User exists");
                account.updateUser(profileData); //update ONLY if data doesn't match
            } else {
                console.log("==New user");
                account.newUser(profileData);
            }
        }).catch(function(err) {
            console.error(err);
            throw err;
        });
    },

    refreshToken: function(req, res) {
        const url = "https://accounts.spotify.com/api/token";

        const payload = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: req.session.refresh_token,
                client_id: client_id
            })
        }

        return fetch(url, payload).then(function(body) {
            return body.json();
        }).then(function(response) {
            now = Date.now() / 1000;
            req.session.token_expires_in = response.expires_in;
            req.session.token_timestamp = now;
            req.session.access_token = response.access_token;
            if (response.refresh_token) {
                req.session.refresh_token = response.refresh_token;
            }
        }).catch(function(err) {
            console.error(err);
            throw err;
        });
    },

    //API call for users top items
    //Use type for 'artists' or 'tracks'
    //Use term for 'short_term', 'medium_term', 'long_term'
fetchTopItems: async function(req, res, token, type, term, totalLimit = 50) {
        const batchSize = 50;
        const promises = [];

        for (let offset = 0; offset < totalLimit; offset += batchSize) {
            const url = `https://api.spotify.com/v1/me/top/${type}?offset=${offset}&limit=${batchSize}&time_range=${term}`;
            promises.push(
                fetch(url, { headers: { Authorization: `Bearer ${token}` } })
            );
        }
        try {
            console.log(`Fetching ${totalLimit} items for ${type}...`);
            const responses = await Promise.all(promises);
            let allItems = [];
            for (let i = 0; i < responses.length; i++) {
                const response = responses[i];
                if (response.ok) {
                    const text = await response.text();
                    if (text) {
                        try {
                            const data = JSON.parse(text);
                            if (data.items) {
                                allItems = allItems.concat(data.items);
                            }
                        } catch (e) {
                        }
                    }
                }
            }

            console.log(`Successfully collected ${allItems.length} items.`);
            return { items: allItems };

        } catch (err) {
            console.error("Error in fetchTopItems:", err);
            return { items: [] };
        }
    }
}