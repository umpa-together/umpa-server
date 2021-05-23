const mongoose = require('mongoose');


const curationpostSchema = new mongoose.Schema({
    isSong : Boolean,
    object : {},
    postUser : {
        type: String,
        required: true
    },
    postUserId : {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    time: {
        type : String,
    },
    textcontent: {
        type: String,
        required: true
    },
    songoralbumid : {
        type: String,
        required: true,
    },
    rating : Number,
    likes : [String],
    hidden : Boolean,
});

mongoose.model('CurationPost', curationpostSchema);



