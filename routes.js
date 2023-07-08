const passport = require("passport");
const bcrypt = require("bcrypt");


module.exports = function (app, myDatabase) {
    //rendering the home page with PUG's variables
  app.route('/').get((req, res) => {
    res.render('index', { title: 'Connected to Database', message: 'Please log in', showLogin: true, showRegistration: true, showSocialAuth: true });
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

    //github OAuth routes
    app.route("/auth/github").get(passport.authenticate('github'));
    app.route("/auth/github/callback").get(passport.authenticate('github', { failureRedirect: "/" }), (req, res) => {
      res.redirect("/profile");
    })


  //handles all the pipelines that are not specified in the program, returning a "not found" message
  app.use((req, res, next) => {
    res.status(404)
      .type("text")
      .send("Not found");
  })

  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  }
}