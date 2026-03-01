import mongoose, { model, Schema } from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is not defined in the environment variables");
}

mongoose.connect(dbUrl)
  .then(() => console.log("Connected to MongoDB ✅"))
  .catch((err) => console.error("DB connection error ❌", err));

// User Schema
const UserSchema = new Schema({
  username: { 
    type: String, 
    unique: true, 
    required: [true, 'Username is required'],
    trim: true,
    minlength: [4, 'Username must be at least 4 characters'],
    maxlength: [10, 'Username cannot exceed 10 characters']
  },
  password: { type: String, required: true },
}, {
  timestamps: true
});

export const UserModel = model("User", UserSchema);


// Link Schema
const LinkSchema = new Schema({
  hash: { 
    type: String, 
    required: true,
    unique: true
  },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true, 
    unique: true 
  },
}, {
  timestamps: true
});

export const LinkModel = model("Link", LinkSchema);