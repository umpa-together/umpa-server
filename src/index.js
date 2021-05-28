require('./models/User');
require('./models/Board');
require('./models/BoardContent')
require('./models/BoardComment');
require('./models/Playlist');
require('./models/PlaylistComment');
require('./models/BoardSong');
require('./models/Curation');
require('./models/Curationpost');
require('./models/Notice');
require('./models/Hashtag');
require('./models/Weekly');
require('./models/Report');


const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/authRoutes');
const applemusicRoutes = require('./routes/applemusicRoutes');
const boardRoutes = require('./routes/boardRoutes');
const plistRoutes = require('./routes/plistRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const djRoutes = require('./routes/djRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const WeeklyRoutes = require('./routes/WeeklyRoutes');
const reportRoutes = require('./routes/reportRoutes');

const curationRoutes = require('./routes/curationRoutes');
const requireAuth = require('./middlewares/requireAuth');

const app = express();
app.use(bodyParser.json());

app.use(authRoutes);
app.use(applemusicRoutes);
app.use(userRoutes);
app.use(noticeRoutes);
app.use(curationRoutes);
app.use(djRoutes);
app.use(WeeklyRoutes);
app.use(reportRoutes);
app.use(searchRoutes);
app.use(plistRoutes);
app.use(boardRoutes);

mongoose.connect(process.env.mongoUri, {
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

app.get('/', requireAuth, (req, res) => {
    res.send(`Your email: ${req.user.email}`);
});
app.listen(3000, () => {
    console.log('Listening on port 3000');
});