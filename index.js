const express = require('express');
const fs = require('fs');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const fileName = 'storage.data'

let fileData;
app.use(bodyParser.json());

fs.readFile(fileName, 'utf8', function (err, data) {
  fileData = data && JSON.parse(data) || [];
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
});

// POST /users
app.post('/users', (req, res) => {
  if (!validator(req.body)) {
    createResponse(409, `Request data is missed. `, res);
  }

  const check = search('email', req.body.email, fileData);

  if (check) {
    createResponse(409, `User ${req.body.name} exists.`, res);
  } else {
    updateFile(req.body);
    createResponse(201, `User ${req.body.name} added successfully!`, res);
  }
})

// GET /users
app.get('/users', (req, res) => {
  const result = fileData.map(item => { return {
    id: item.id,
    name: item.name,
    email: item.email
  }});
  createResponse(200, result || [], res);
})

// GET /users/:id
app.get('/users/:id', (req, res) => {
  const result = search('id', req.params.id, fileData);

  if (result) {
    delete result.password;
    createResponse(200, result, res);
  } else {
    createResponse(404, `User with id: ${req.params.id} not found.`, res);
  }
})

// PUT /users/:id
app.put('/users/:id', (req, res) => {
  if (!validator(req.body)) {
    createResponse(404, `Some request data is missed.`, res);
    return;
  }

  const id = req.params.id;
  const check = search('id', id, fileData);

  if (check) {
    comparePassword(req.body.password, check.password, (err, result) => {
      if (err || !result) {
        createResponse(404, `Wrong password.`, res);
      } else {
        updateFile(req.body, search('id', id, fileData, true));
        createResponse(200, `User ${req.body.name} updated successfully!`, res);
      }
    });
  } else {
    createResponse(404, `User with id: ${id} not found.`, res);
  }
})

// DELETE /users/:id
app.delete('/users/:id', (req, res) => {
  const id = req.params.id;
  const check = search('id', id, fileData);

  if (check) {
    removeFromFile(id);
    createResponse(200, `User ${check.name} removed successfully!`, res);
  } else {
    createResponse(404, `User with id: ${id} not found.`, res);
  }
})

function search(key, val, arr, returnId){
  for (let i = 0, l = arr.length; i < l; i++) {
    if (String(arr[i][key]) === String(val)) {
      return returnId ? i : arr[i];
    }
  }
}

function updateFile(data, id) {
  if (id) {
    fileData[id].name = data.name;
    fileData[id].email = data.email;

    rewriteFile();
  } else {
    cryptPassword(data.password, (err, res) => {
      fileData.push({
        id: Date.now(),
        name: data.name,
        email: data.email,
        password: res
      });

      rewriteFile();
    });
  }
}

function rewriteFile() {
  const newData = JSON.stringify(fileData, null, 2);

  fs.writeFile(fileName, newData, function (err) {
    if (err) return console.log(err);
  });
}

function removeFromFile(id) {
  fileData.splice(search('id', id, fileData, true), 1);
  rewriteFile();
}

function createResponse(status, data, res) {
  res.status(status);
  res.send(data);
}

function validator(data) {
  return data.name && data.email && data.password;
}


function cryptPassword(password, callback) {
   bcrypt.genSalt(10, function(err, salt) {
    if (err)
      return callback(err);

    bcrypt.hash(password, salt, function(err, hash) {
      return callback(err, hash);
    });
  });
};

function comparePassword(plainPass, hashword, callback) {
   bcrypt.compare(plainPass, hashword, function(err, isPasswordMatch) {
       return err == null ?
           callback(null, isPasswordMatch) :
           callback(err);
   });
};