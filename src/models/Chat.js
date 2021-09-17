const mongoose = require('mongoose');

const chatroomSchema = new mongoose.Schema({
    participate: [{
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    }],
    messages: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Chatmsg',
    }],
    
    Rejectperson: [{
       type:String
    }],
});

const chatmsgSchema = new mongoose.Schema({
    chatroomid: {
        type: mongoose.Schema.Types.ObjectId,
        
        ref: 'Chatroom',
    },
    sender: {
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
    image: {
        type: String,
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

mongoose.model('Chatmsg', chatmsgSchema);
mongoose.model('Chatroom', chatroomSchema);