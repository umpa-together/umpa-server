const mongoose = require('mongoose');

const reCommentSchema = new mongoose.Schema({
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    comment: {
        type: String,
        required: true
    },
    time: {
        type: String
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    likes: [],
});

const commentSchema = new mongoose.Schema({
    postUser: {
        type: String,
        required: true,
    },
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    contentId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'boardContent'
    },
    comment: {
        type: String,
        required: true
    },
    time: {
        type : String
    },
    likes: [],
    comments: [reCommentSchema],
    isDeleted: {
        type: Boolean,
        default: false,
    }
});

mongoose.model('BoardComment', commentSchema);
mongoose.model('BoardReComment', reCommentSchema);