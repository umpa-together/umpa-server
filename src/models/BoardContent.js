const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    postUser: {
        type: String,
        required: true,
    },
    postUserId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    boardId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Board',
    },
    time: {
        type: String,
        required: true,
    },
    comments: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'BoardComment',
    }],
    likes: [],
    scrabs: [],
    image: {
        type: Array,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    },
    song: {
        type: Object
    }
});

mongoose.model('boardContent', contentSchema);