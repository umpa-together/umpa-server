const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config()
const helmet = require('helmet')
const hpp = require('hpp')
const app = express();
const server = require('http').createServer(app);
const morgan = require('morgan')
const PORT = 3000
const accessLogStream = require('./utils/log')

require('./models/User');
require('./models/RelayPlaylist');
require('./models/RelaySong');
require('./models/RelayComment');
require('./models/RelayRecomment');
require('./models/Playlist');
require('./models/PlaylistComment');
require('./models/PlaylistRecomment');
require('./models/Daily');
require('./models/DailyComment');
require('./models/DailyRecomment');
require('./models/Feed');
require('./models/StorySong');
require('./models/AddedSong');
require('./models/AddedPlaylist');
require('./models/Hashtag');
require('./models/Genre');
require('./models/RecentKeyword');
require('./models/Theme');
require('./models/Report');
require('./models/Notice');
require('./models/Announcement');
require('./models/Guide');

const authRoutes = require('./routes/authRoutes');
const applemusicRoutes = require('./routes/applemusicRoutes');
const plistRoutes = require('./routes/plistRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dailyRoutes = require('./routes/dailyRoutes');
const feedRoutes = require('./routes/feedRoutes');
const relayRoutes = require('./routes/relayRoutes');
const storyRoutes = require('./routes/storyRoutes');
const mainRoutes = require('./routes/mainRoutes');
const addedRoutes = require('./routes/addedRoutes');
const requireAuth = require('./middlewares/requireAuth');

mongoose.connect(process.env.NODE_ENV === 'dev' ? process.env.DEV_MONGO_URI : process.env.PRODUCT_MONGO_URI, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify : false,
});

const db = mongoose.connection;

db.on('connected', () =>{
    console.log('Connected to mongo instance');
});
db.on('error', (err) => {
    console.log('Error connecting to mongo', err);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'product'){
    require('./utils/schedule')
    app.use(helmet())
    app.use(hpp())
    app.use(morgan('[:remote-addr - :remote-user] [:date[web]] :method :url HTTP/:http-version :status :response-time ms', { stream : accessLogStream }));
} else {
    app.set("etag", false);
    app.use(morgan('dev'));
}

app.use(authRoutes);
app.use(requireAuth);
app.use('/searchMusic', applemusicRoutes);
app.use('/user', userRoutes);
app.use('/notice', noticeRoutes);
app.use('/report', reportRoutes);
app.use('/search', searchRoutes);
app.use('/playlist', plistRoutes);
app.use('/daily', dailyRoutes);
app.use('/feed', feedRoutes);
app.use('/relay', relayRoutes);
app.use('/story', storyRoutes);
app.use('/main', mainRoutes);
app.use('/added', addedRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to umpa');
});

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
});