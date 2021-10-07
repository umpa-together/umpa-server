const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema({
    participate: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatMsg',
    }],
    time: {
        type : String
    },
    rejectPerson: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
});

const chatmsgSchema = new mongoose.Schema({
    chatroomId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChatRoom',
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    type : {
        type: String
    },
    text : {
        type: String
    },
    time: {
        type : String
    },
    object: {
    },
    isRead : {
        type: Boolean,
        default: false,
    },
    isDeleted: {
        type: Boolean,
        default: false,
    }
});

mongoose.model('ChatMsg', chatmsgSchema);
mongoose.model('ChatRoom', chatroomSchema);