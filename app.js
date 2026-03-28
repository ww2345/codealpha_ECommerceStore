const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const flash = require("connect-flash");

const User = require("./models/users");

const loginRoute = require("./routes/login");
const homeRoute = require("./routes/home");
const registerRoute = require("./routes/register");
const logoutRoute = require("./routes/logout");

const app = express();
const port = 3000;


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/ECommerceStore");
}
main().then((req, res) => {
  console.log("Connection to Database Established ... ");
}).catch((err) => {
  console.log(err);
});


app.listen(port, () => {
  console.log(`Server Started on port ${port} ... `);
});

const sessionOption = {
  secret: "ishant",
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
  },
};

app.use(session(sessionOption));
app.use(flash());

// passport used for authntication 
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
//flash message midleware
app.use((req, res, next) => {
  const sessionCart = Array.isArray(req.session.cart) ? req.session.cart : [];
  const cartCount = sessionCart.reduce((total, item) => {
    const quantity = Number.parseInt(item && item.quantity, 10);
    return total + (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
  }, 0);

  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.currentUser = req.user;
  res.locals.cartCount = cartCount;
  next();
});



function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be logged in");
  res.redirect("/Ecommerce/login");
}

function redirectIfAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return res.redirect("/Ecommerce/home");
  }
  next();
}

// from here routes started 

//login route 
app.use("/Ecommerce/login", redirectIfAuthenticated, loginRoute);

// home route 
app.use("/Ecommerce/home", homeRoute);

// register route 
app.use("/Ecommerce/register", redirectIfAuthenticated, registerRoute);

// logout route
app.use("/Ecommerce/logout", logoutRoute);
