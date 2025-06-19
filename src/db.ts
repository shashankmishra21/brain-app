import mongoose, {model, mongo, Schema} from "mongoose";
mongoose.connect("mongodb+srv://mishrashashank2106:youwerenotsupposedtodoso@cluster0.i6qbf94.mongodb.net/brain-app")


const UserSchema = new Schema ({
    username: {type: String , unique : true}, 
    password: String 
})

export const UserModel = model("User", UserSchema );

const ContentSchema = new Schema ({
    title: String,
    link: String,
    tags: [{ type: mongoose.Types.ObjectId, ref: 'Tag'}],
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true}
})

export const ContentModel = model("Content", ContentSchema);

export const LinkSchema = new Schema({
    hash : String,
    userId: { type: mongoose.Types.ObjectId, ref: 'User', required: true , unique: true},

}) 

export const LinkModel = model("Link", LinkSchema);