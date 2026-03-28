const express = require("express");
const router = express.Router();

function doLogout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "Logged out successfully");
    res.redirect("/Ecommerce/login");
  });
}

router.get("/", doLogout);
router.post("/", doLogout);

module.exports = router;
