// eslint-disable-next-line import/no-extraneous-dependencies
import mongoose from "mongoose";

/**
 * Define the Mongoose Schema for a User.
 */
const userSchema = new mongoose.Schema({
  first_name: String,
  last_name: String,
  location: String,
  description: String,
  occupation: String,

  // login_name must be unique and required
  login_name: { 
    type: String, 
    required: true, 
    unique: true 
  },

  // store user passwords
  password: {
    type: String,
    required: true
  }
});

/**
 * Create a Mongoose Model for a User using the userSchema.
 */
const User = mongoose.model("User", userSchema);

/**
 * Make this available to our application.
 */
export default User;