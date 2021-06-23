const mongoose = require('mongoose');

const curationcommentSchema = new mongoose.Schema({
    curationPostId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Curationpost'
    },

    postUserId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    text: {
        type: String,
        required: true
    },
    time: {
        type: String
    },
    
});

mongoose.model('CurationpostComment', curationcommentSchema);