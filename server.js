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

const app = express();

app.set('view engine', 'pug');
app.set('views', './views/pug');

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}))

app.use(passport.initialize());
app.use(passport.session());

myDB(async client => {
  const myDatabase = await client.db('advanced-node').collection('users');

  //rendering the home page with PUG's variables
  app.route('/').get((req, res) => {
    res.render('index', { title: 'Connected to Database', message: 'Please log in', showLogin: true, showRegistration: true });
  });
  //post method for login a user, if user exists and password is correct, redirects to /profile pipeline
  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  })
  //render the profile view with the user's data IF the function ensureAuthenticated validates the operation (if the user is logged in) 
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('profile', { username: req.user.username });
  })
  //logout the user and redirect to home page
  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect("/");
  })


  //register of a new user
  app.route('/register')
    .post((req, res, next) => {
      myDatabase.findOne({ username: req.body.username }, (err, user) => {
        if (err) { 
          next(err); //if there is an error we call the NEXT builtin func with that error
        } else if (user) {
            res.redirect('/'); // if USER already exist, redirect to home page
        } else {
          let hash = bcrypt.hashSync(req.body.password, 12);
          myDatabase.insertOne({
            username: req.body.username,
            password: hash
          }, (err, doc) => {
            if (err){
              res.redirect('/')
            } else {
             next(null, doc.ops[0]); // The inserted document is held within the ops property of the doc
            } 
          })
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );

    
  //handles all the pipelines that are not specified in the program, returning a "not found" message
  app.use((req, res, next) => {
    res.status(404)
      .type("text")
      .send("Not found");
  })

  //serialize and deserialize for cookies encryption
  passport.serializeUser((user, done) => {
    done(null, user._id);
  })
  
  passport.deserializeUser((id, done) => {
    myDatabase.findOne( { _id: new ObjectID(id) }, (err, doc) => {
      done(null, doc);
    })
  })

  //passport's LocalStrategy instance for login a user comparing the POSTED data with the database data.
  passport.use(new LocalStrategy((username, password, done) => {
    myDatabase.findOne({ username: username }, (err, user) => {
      console.log(`User ${username} attempted to log in.`);
      if (err) return done(err);
      if (!user) return done(null, false);
      if (!bcrypt.compareSync(password, user.password)) return done(null, false);
      return done(null, user);
    })
  }))


//handling errors in the process.
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
})
//function to ensure that a user is authenticated
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
