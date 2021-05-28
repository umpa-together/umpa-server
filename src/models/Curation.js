const mongoose = require('mongoose');

const curationSchema = new mongoose.Schema({
    isSong : Boolean,
    object : {},
    rating : {
        type : Number,
        default : 0,
    },
    likes : [String],
    participate : [String],
    songoralbumid : {
        type: String,
        unique: true,
    },
    nominate: {
        type: Number,
        default: 0
    }

});

mongoose.model('Curation', curationSchema);