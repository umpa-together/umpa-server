const mongoose = require('mongoose');

const weeklyPlaylistSchema = new mongoose.Schema({
    playlist: [],
    time: {
        type: String,
        required: true
    }
});

const WeeklyCurationSchema = new mongoose.Schema({
    curation:[{
        type:mongoose.Schema.Types.ObjectId,
        required: true,
        ref:'Curation'
    }],
    time: {
        type: String
    },
});

const WeeklyDJSchema = new mongoose.Schema({
    DJ:[{
        type:mongoose.Schema.Types.ObjectId,
        required: true,
        ref:'User'
    }],
    time: {
        type: String
    },
});

const WeeklyDailySchema = new mongoose.Schema({
    daily:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Daily'
    }]
})

mongoose.model('WeeklyPlaylist', weeklyPlaylistSchema);
mongoose.model('WeekCuration', WeeklyCurationSchema);
mongoose.model('WeekDJ', WeeklyDJSchema);
mongoose.model('WeeklyDaily', WeeklyDailySchema)