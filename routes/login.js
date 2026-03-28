const express = require("express");
const router = express.Router();
const passport = require("passport");

router.get("/", (req, res) => {
  res.render("pages/login");
});

router.post(
  "/",
  passport.authenticate("local", {
    failureRedirect: "/Ecommerce/login",
    failureFlash: "Invalid username or password",
  }),
  (req, res) => {
    req.flash("success", "Login successful");
    res.redirect("/Ecommerce/home");
  },
);

module.exports = router;
