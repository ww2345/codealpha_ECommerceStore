const mongoose = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose").default;

const { Schema } = mongoose;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
    min: 6,
  },
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("Users", userSchema); 
