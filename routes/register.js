const express = require("express");
const router = express.Router();

const Users = require("../models/users");

router.get("/", (req, res) => {
  res.render("pages/register");
});

router.post("/", async (req, res) => {
  try {
    const { username, password, email } = req.body;

    const newUser = new Users({ username, email });
    await Users.register(newUser, password);

    req.flash("success", "Account created successfully. Please log in.");
    res.redirect("/Ecommerce/login");
  } catch (err) {
    let message = err?.message || "Registration failed";
    if (err?.name === "UserExistsError") {
      message = "That username is already taken. Please choose another one.";
    }
    req.flash("error", message);
    res.redirect("/Ecommerce/register");
  }
});


module.exports = router; 
