const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config()
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const PORT = 3000

require('./models/User');
require('./models/Playlist');
require('./models/PlaylistComment');
require('./models/Notice');
require('./models/Hashtag');
require('./models/Weekly');
require('./models/Report');
require('./models/Daily');
require('./models/DailyComment');
require('./models/Chat')
require('./models/Feed')
require('./models/RelayPlaylist');
require('./models/RelaySong');
require('./models/StorySong');
require('./models/CurationPost');
require('./models/AddedSong');
require('./models/Genre');
require('./models/RecentKeyword');
require('./models/AddedPlaylist');
require('./models/Theme');
require('./models/PlaylistRecomment');
require('./models/DailyRecomment');
require('./models/RelayComment');
require('./models/RelayRecomment');
require('./models/Announcement');

const authRoutes = require('./routes/authRoutes');
const applemusicRoutes = require('./routes/applemusicRoutes');
const plistRoutes = require('./routes/plistRoutes');
const searchRoutes = require('./routes/searchRoutes');
const userRoutes = require('./routes/userRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const reportRoutes = require('./routes/reportRoutes');
const dailyRoutes = require('./routes/dailyRoutes');
const chatRoutes = require('./routes/chatRoutes');
const feedRoutes = require('./routes/feedRoutes');
const relayRoutes = require('./routes/relayRoutes');
const storyRoutes = require('./routes/storyRoutes');
const mainRoutes = require('./routes/mainRoutes');
const addedRoutes = require('./routes/addedRoutes');
const requireAuth = require('./middlewares/requireAuth');

const ChatRoom = mongoose.model('ChatRoom');
const ChatMsg= mongoose.model('ChatMsg');
const User = mongoose.model('User');
const admin = require('firebase-admin');

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

app.set('io', io);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authRoutes);
app.use(requireAuth);
app.use('/searchMusic', applemusicRoutes);
app.use('/user', userRoutes);
app.use('/notice', noticeRoutes);
app.use('/report', reportRoutes);
app.use('/search', searchRoutes);
app.use('/playlist', plistRoutes);
app.use('/daily', dailyRoutes);
app.use('/chat', chatRoutes);
app.use('/feed', feedRoutes);
app.use('/relay', relayRoutes);
app.use('/story', storyRoutes);
app.use('/main', mainRoutes);
app.use('/added', addedRoutes);

app.get('/', (req, res) => {
    res.send('Welcome to umpa');
});

app.set("etag", false);

const chat = io.use(requireAuth).of('chat').on('connection', function(socket){
    socket.on('joinroom', function(data){
        console.log(data.room, 'room id is joined')
        socket.join(data.room);
    })

    socket.on('chat message', async function(data){
        var newDate = new Date()
        var time = newDate.toFormat('YYYY/MM/DD HH24:MI:SS');
        var chatroom; 
        try{
            const chatmsg = await ChatMsg({
                chatroomId: data.room, 
                time, 
                type: data.type, 
                text: data.text, 
                sender: data.sender, 
                receiver: data.receiver,
                song: data.song,
                isRead:false,
            }).save()
            chatroom = await ChatRoom.findOneAndUpdate({
                _id: data.room
            }, {
                $push: { messages: chatmsg }, 
                $set: { time }
            }, { 
                new:true 
            }).populate('messages', {
                sender: 1, text: 1, time: 1, isRead: 1, type: 1, song:1,
            });
            const targetuser = await User.findOne({ _id: data.receiver });
            if( targetuser.noticetoken != null  && targetuser._id.toString() != data.sender.toString()){
                var message = {
                    notification : {
                        title: targetuser.name,
                        body : data.text,
                    },
                    token : targetuser.noticetoken
                };
                try {
                    admin.messaging().send(message).then((response)=> {}).catch((error)=>{console.log(error);});
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            }
        }catch(err){
            console.log(err)
        }
        var room = socket.room = data.room;
        chat.to(room).emit('chat message', chatroom);
    })

    socket.on('end', function(data){
        console.log('end');
        socket.disconnect();
    })
})

server.listen(PORT, () => {
    console.log('Listening on port 3000');
});