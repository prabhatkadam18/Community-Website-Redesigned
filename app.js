require('dotenv').config(); 
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const session = require('express-session');

app.set('view engine', 'ejs');
app.use(express.static('public'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({secret: process.env.SESSION_SECRET, 
  resave: false, 
  saveUninitialized: true, 
  cookie: {}
}));
//app.use(morgan('tiny'));

function isAuthenticated(req, res, next){
  if(req.session.user){
    next();
  } else {
    res.redirect('/');
  }
}

app.use('/user', isAuthenticated);

const saltRounds = 5;


mongoose.connect('mongodb://localhost:27017/' + process.env.DATABASE_NAME, {useNewUrlParser: true, useUnifiedTopology: true} ,(err)=>{
  if(err){
    console.log("Error Connecting to DB");
  }else {
    console.log("DB Connected");
  }
});

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  type: String,
  name: String,
  Location: String,
  dateCreated: Number,
  isVerified: {type: Boolean, default: false},
  isActive: {type: Boolean, default: true},
  passwordResetToken: String,
  resetTokenExpires: Number,
  communitiesOwned: {type: [mongoose.Schema.Types.ObjectId], ref: 'Community', default: undefined},
  communitiesJoined: {type: [mongoose.Schema.Types.ObjectId], ref: 'Community', default: undefined},  //Joined exclusive of Owned
  outgoingRequests: {type: [mongoose.Schema.Types.ObjectId], ref: 'Request', default: undefined},
  incomingRequests: {type: [mongoose.Schema.Types.ObjectId], ref: 'Request', default: undefined}
});

const communitySchema = new mongoose.Schema({
  name: String,
  owner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  communityMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  communityManagers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User'}],
  isOpen: Boolean,
  // requests: [{type: mongoose.Schema.Types.ObjectId, ref: 'User'}]
})

const requestSchema = new mongoose.Schema({
  requestedBy: {type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  requestedCommunity: {type: mongoose.Schema.Types.ObjectId, ref: 'Community'},
  communityOwner: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}
})

const User = mongoose.model('Users', userSchema);
const Community = mongoose.model('Communities', communitySchema);
const Request = mongoose.model('Request', requestSchema);

app.get('/', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res)=>{
  if(req.session.user){
    return res.redirect("/user");
  } else {
    User.findOne({email: req.body.email.trim().toLowerCase()})
    .catch( err =>{
      console.log(err);
    })
    .then(user=>{
      if(user){
        bcrypt.compare(req.body.password, user.password).then( u=>{
          if(u){
            req.session.user = user;
            return res.redirect('/user');
          } else {
            return res.send("Wrong Password");
          }
        });
      } else {
        return res.send("No User Found");
      }
    });
  }
});

app.get('/register', (req, res)=>{
  if(req.session.user)
    return res.redirect('/user');
  res.render('register');
});

app.post('/register', (req, res)=>{
  User.findOne({email: req.body.email.trim().toLowerCase()})
  .catch(err=>{
    console.log(err);
  })
  .then( user =>{
    if(user){
      return res.send("email taken");
    } else {
      bcrypt.hash(req.body.password, saltRounds).then(hashedPassword=>{
        var newUser = new User({
          email: req.body.email.trim().toLowerCase(),
          password: hashedPassword,
          dateCreated: Date.now(),
          type: req.body.type
        })
        newUser.save();
        req.session.user = newUser;
        return res.send("user registered");
      });
    }
  })
});

app.get('/user', (req, res)=>{
  res.send("User");
})

// app.get('/test', (req, res)=>{
//   var u = req.session.user;
//   var d = new Date(u.dateCreated);
//   console.log(d.getDate());
// })

app.get('/logout', (req, res)=>{
  req.session.destroy();
  res.redirect('/');
});

app.listen(2020, () => {
  console.log("Server started on 2020");
})