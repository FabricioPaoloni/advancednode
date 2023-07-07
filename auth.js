const passport = require("passport");
const bcrypt = require("bcrypt");
const LocalStrategy = require('passport-local');
const { ObjectID } = require("mongodb");

module.exports = function (app, myDatabase) {
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

}