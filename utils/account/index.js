/*
    methods {
        userExists(id)
        getUser(id)
        newUser(profileData)
        updateUser(profileData)
    }
*/

var fs = require('fs')
var path = require('path')

var filePath = path.join(__dirname, "../..", 'userData.json')

function readUsers() {
  if (!fs.existsSync(filePath)) 
    return []
  var data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

function writeUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
}

function getPfp(profileData) {
  if(profileData.images && profileData.images.length > 0) {
      return profileData.images[0].url;
  } else {
      return "/images/noPfp.jpg";
  }
}


module.exports = {
  userExists: function(id) {
    var users = readUsers();
    return users.some(function(user) {
        return user.id === id;
    });
  },

  getUser: function(id) {
    var users = readUsers();
    var user =  users.find(function(user) {
        return user.id === id;
    });
    return user || null;
  },

  newUser: function(profileData) {
    var users = readUsers();
    var pfp = getPfp(profileData);

    users.push({ 
        "id": profileData.id, 
        "username": profileData.display_name,
        "pfp": pfp
    })
    writeUsers(users);
  },

  updateUser: function(profileData) {
    var users = readUsers();
    var user =  users.find(function(user) {
        return user.id === profileData.id;
    });
    var changed = false;
    var pfp = getPfp(profileData);

    if (user.username !== profileData.display_name) {
      user.username = profileData.display_name;
      changed = true;
    }

    if (user.pfp !== pfp) {
      user.pfp = pfp;
      changed = true;
    }

    const keys = ["id", "username", "pfp"];
    for (var key in user) {
      if (!keys.includes(key)) {
        delete user[key];
        changed = true;
      }
    }

    console.log(user);
    if(changed) {
      console.log("==User data was updated with latest data");
      writeUsers(users);
    }
  }
};