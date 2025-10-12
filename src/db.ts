import mongoose, { model, Schema } from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

//  Updated connection (no need for deprecated options)
const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is not defined in the environment variables");
}

mongoose.connect(dbUrl)
  .then(() => console.log("Connected to MongoDB ✅"))
  .catch((err) => console.error("DB connection error ❌", err));

//  User Schema
const UserSchema = new Schema({
  username: { type: String, unique: true },
  password: { type: String, required: true },
});

export const UserModel = model("User", UserSchema);

//  Content Schema
const ContentSchema = new Schema({
  title: { type: String, required: true }, 
  link: { type: String, required: false },  // Conditional based on type
  description: { type: String, required: true },    // Conditional based on type
  type: { 
    type: String, 
    required: true,
   enum: ['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'documents', 'other'] // Updated enum
  },
  
  // Document file support
  fileName: { type: String }, // If file uploaded
  filePath: { type: String }, // File path on server
  fileSize: { type: Number },
  
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, {
  timestamps: true
});

export const ContentModel = model("Content", ContentSchema);

//  Link Schema
const LinkSchema = new Schema({
  hash: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
});

export const LinkModel = model("Link", LinkSchema);
