const mongoose = require('mongoose');

const guideSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    image: {
        type: String
    }
});

mongoose.model('Guide', guideSchema);
