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

// Content Schema - FIXED
const ContentSchema = new Schema({
  title: { 
    type: String, 
    required: [true, 'Title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  }, 
  link: { 
    type: String, 
    required: false,
    trim: true,
    validate: {
      validator: function(v: string) {
        if (!v) return true; // Allow empty
        return /^https?:\/\/.+/.test(v);
      },
      message: 'Link must be a valid URL'
    }
  },
  description: { 
    type: String, 
    required: false, // ✅ Changed from true to false
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters'],
    default: '' // ✅ Added default empty string
  },
  type: { 
    type: String, 
    required: [true, 'Content type is required'],
    enum: {
      values: ['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'documents', 'other'],
      message: '{VALUE} is not a valid content type'
    }
  },
  
  // Document file support
  fileName: { 
    type: String,
    trim: true
  },
  filePath: { 
    type: String,
    trim: true
  },
  fileSize: { 
    type: Number,
    min: [0, 'File size cannot be negative'],
    max: [10485760, 'File size cannot exceed 10MB']
  },
  
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tag" }],
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
}, {
  timestamps: true
});

// Add validation for type-specific requirements
ContentSchema.pre('save', function(next) {
  // Social media types require both link and description
  if (['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest'].includes(this.type)) {
    if (!this.link || !this.description) {
      return next(new Error('Social media content requires both link and description'));
    }
  }
  
  // Documents require either file or link
  if (this.type === 'documents') {
    if (!this.fileName && !this.link) {
      return next(new Error('Documents must have either a file or link'));
    }
  }
  
  // Other type requires either link or description
  if (this.type === 'other') {
    if (!this.link && !this.description) {
      return next(new Error('Other content requires either link or description'));
    }
  }
  
  next();
});

export const ContentModel = model("Content", ContentSchema);

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
