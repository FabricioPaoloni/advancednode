'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const { ObjectID } = require('mongodb');
const LocalStrategy = require('passport-local');
const bcrypt = require('bcrypt');
const routes = require('./routes.js');
const auth = require('./auth.js');
const cookieParser = require('cookie-parser');
const app = express();

const http = require("http").createServer(app);
const io = require("socket.io")(http);

const passportSocketIo = require('passport.socketio');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });


app.set('view engine', 'pug');
app.set('views', './views/pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
  key: 'express.sid',
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  store: store,
  cookie: { secure: false }
}))

app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
  const myDatabase = await client.db('advanced-node').collection('users');
  routes(app, myDatabase); //instance of the routes.js module.
  auth(app, myDatabase);


  //

  let onAuthorizeSuccess = (data, accept) => {
    console.log('succesful connection to socket.io');
    accept(null, true);
  }
  let onAuthorizeFail = (data, message, error, accept) => {
    if(error) throw new Error(message);
    console.log('failed connection to socket.io', message);
    accept(null, false);
  }

  //socket.IO set for using data in each socket
  io.use(
    passportSocketIo.authorize({
      cookieParser: cookieParser,
      key: 'express.sid',
      secret: process.env.SESSION_SECRET,
      store: store,
      success: onAuthorizeSuccess,
      fail: onAuthorizeFail
    })
  )

  //variable for keep track of the users
  let currentUsers = 0;
  io.on('connection', socket => {
    console.log("user " + socket.request.user.username +" has connected");
    ++currentUsers;
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    });

    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      io.emit('user', {
        username: socket.request.user.username,
        currentUsers,
        connected: false
      });
    })

    socket.on('chat message', message => {
      io.emit('chat message', {
        username: socket.request.user.username,
        message: message
      })
    })
  })

//handling errors in the process.
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
})



const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
