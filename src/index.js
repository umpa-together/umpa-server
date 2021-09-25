require('./models/User');
require('./models/Board');
require('./models/BoardContent')
require('./models/BoardComment');
require('./models/Playlist');
require('./models/PlaylistComment');
require('./models/BoardSong');
require('./models/Curation');
require('./models/Curationpost');
require('./models/CurationpostComment');

require('./models/Notice');
require('./models/Hashtag');
require('./models/Weekly');
require('./models/Report');
require('./models/Daily');
require('./models/DailyComment');
require('./models/Chat')
require('./models/Feed')

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
const dailyRoutes = require('./routes/dailyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const feedRoutes = require('./routes/feedRoutes');

const curationRoutes = require('./routes/curationRoutes');
const requireAuth = require('./middlewares/requireAuth');

const app = express();

const server =require('http').createServer(app);
const io = require('socket.io')(server);

const Chatroom = mongoose.model('Chatroom');
const Chatmsg= mongoose.model('Chatmsg');
const User= mongoose.model('User');


app.set('io', io);
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
app.use(dailyRoutes);
app.use(chatRoutes);
app.use(feedRoutes);

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


const chat = io.use(requireAuth).of('chat').on('connection', function(socket){

    socket.on('joinroom', function(data){
        socket.join(data.room);
    })

    
    socket.on('chat message', async function(data){
        var newDate = new Date()
        var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
        var chatroom; 
        try{
          
            const chatmsg = await Chatmsg({chatroomid:data.room, time, type:data.type, text:data.text, sender: data.id, isRead:false}).save()
            chatroom = await Chatroom.findOneAndUpdate({_id:data.room}, {$push: {messages:chatmsg}}, {new:true}).populate('messages');
        }catch(err){
        }

        var room = socket.room = data.room;
        chat.to(room).emit('chat message', chatroom);
    })

    socket.on('end', function(data){
        console.log('end');

        socket.disconnect();
    })

})

server.listen(3000, () => {
    console.log('Listening on port 3000');
});