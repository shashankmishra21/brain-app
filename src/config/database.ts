import mongoose, { model, Schema } from "mongoose";
import dotenv from 'dotenv';
import logger from './logger';

dotenv.config();

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("DATABASE_URL is not defined in the environment variables");
}

mongoose.connect(dbUrl, {
  maxPoolSize: 10,
  minPoolSize: 2,         // keeps connections warm on Render free tier
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000, // prevents memory leak from stale sockets
  connectTimeoutMS: 10000,
})

  .then(() => logger.warn("Connected to MongoDB"))
  .catch((err) => {
    logger.error({ err }, "DB connection failed");
    process.exit(1);
  });

mongoose.connection.on('disconnected', () => {
  logger.warn("MongoDB disconnected");
});

mongoose.connection.on('error', (err) => {
  logger.error({ err }, "MongoDB runtime error");
});


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
}, { timestamps: true });

export const UserModel = model("User", UserSchema);


const LinkSchema = new Schema({
  hash: {
    type: String,
    required: true,
    unique: true,
    index: true  // queried on every shared brain request
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true  // one brain per user
  },
}, { timestamps: true });

export const LinkModel = model("Link", LinkSchema);