import mongoose, { model, Schema } from "mongoose";

// Content Schema
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
            validator: function (v: string) {
                if (!v) return true;
                return /^https?:\/\/.+/.test(v);
            },
            message: 'Link must be a valid URL'
        }
    },
    description: {
        type: String,
        required: false,
        trim: true,
        maxlength: [1000, 'Description cannot exceed 1000 characters'],
        default: ''
    },
    type: {
        type: String,
        required: [true, 'Content type is required'],
        enum: {
            values: ['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest', 'documents', 'other'],
            message: '{VALUE} is not a valid content type'
        }
    },
    fileName: { type: String, trim: true },
    filePath: { type: String, trim: true, select: false },
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

    aiSummary: {
        type: String,
        default: ''
    },
    aiTags: [{
        type: String
    }],
    processedAt: {
        type: Date,
        default: null
    },

}, {
    timestamps: true
});

ContentSchema.pre('save', function (next) {
    if (['linkedin', 'twitter', 'instagram', 'youtube', 'pinterest'].includes(this.type)) {
        if (!this.link || !this.description) {
            return next(new Error('Social media content requires both link and description'));
        }
    }
    if (this.type === 'documents') {
        if (!this.fileName && !this.link) {
            return next(new Error('Documents must have either a file or link'));
        }
    }
    if (this.type === 'other') {
        if (!this.link && !this.description) {
            return next(new Error('Other content requires either link or description'));
        }
    }
    next();
});

export const ContentModel = model("Content", ContentSchema);