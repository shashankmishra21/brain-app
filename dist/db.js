"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LinkModel = exports.ContentModel = exports.UserModel = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
    throw new Error("DATABASE_URL is not defined in the environment variables");
}
mongoose_1.default.connect(dbUrl)
    .then(() => console.log("Connected to MongoDB ✅"))
    .catch((err) => console.error("DB connection error ❌", err));
// User Schema
const UserSchema = new mongoose_1.Schema({
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
exports.UserModel = (0, mongoose_1.model)("User", UserSchema);
// Content Schema - FIXED
const ContentSchema = new mongoose_1.Schema({
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
            validator: function (v) {
                if (!v)
                    return true; // Allow empty
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
    tags: [{ type: mongoose_1.default.Schema.Types.ObjectId, ref: "Tag" }],
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
}, {
    timestamps: true
});
// Add validation for type-specific requirements
ContentSchema.pre('save', function (next) {
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
exports.ContentModel = (0, mongoose_1.model)("Content", ContentSchema);
// Link Schema
const LinkSchema = new mongoose_1.Schema({
    hash: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose_1.default.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
}, {
    timestamps: true
});
exports.LinkModel = (0, mongoose_1.model)("Link", LinkSchema);
