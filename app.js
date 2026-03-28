require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
const ejsMate = require("ejs-mate");
const methodOverride = require("method-override");
const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const session = require("express-session");
const connectMongo = require("connect-mongo");
const flash = require("connect-flash");

const User = require("./models/users");

const loginRoute = require("./routes/login");
const homeRoute = require("./routes/home");
const registerRoute = require("./routes/register");
const logoutRoute = require("./routes/logout");

const app = express();
const port = Number.parseInt(process.env.PORT, 10) || 3000;
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/ECommerceStore";
const sessionSecret = process.env.SESSION_SECRET || "change-this-session-secret";
const isProduction = process.env.NODE_ENV === "production";
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;

if (isProduction) {
  app.set("trust proxy", 1);
}


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

const sessionStore = MongoStore.create({
  mongoUrl: mongoUri,
  touchAfter: 24 * 60 * 60,
});

sessionStore.on("error", (err) => {
  console.error("Session store error.", err);
});

const sessionOption = {
  store: sessionStore,
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
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

async function startServer() {
  try {
    await mongoose.connect(mongoUri);
    console.log("Connection to Database Established ... ");

    app.listen(port, () => {
      console.log(`Server Started on port ${port} ... `);
    });
  } catch (err) {
    console.error("Failed to start server.", err);
    process.exit(1);
  }
}

startServer();
