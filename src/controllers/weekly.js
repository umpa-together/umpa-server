const mongoose = require('mongoose');
const Playlist = mongoose.model('Playlist');
const Daily = mongoose.model('Daily');
const WeeklyPlaylist = mongoose.model('WeeklyPlaylist');
const WeeklyDaily = mongoose.model('WeeklyDaily');
require('date-utils');

const getWeeklyPlaylist = async (req, res) => {
    try{
        const weekly = await WeeklyPlaylist.find().sort({'time': -1}).limit(1);
        const result = [];
        for(let key in weekly[0].playlist){
            try {
                const playlist = await Playlist.find({_id: weekly[0].playlist[key]}, {title: 1, hashtag: 1, image: 1}).populate('postUserId', {name: 1, profileImage: 1});
                result.push(playlist[0]);
            } catch (err) {
                return res.status(422).send(err.message);
            };
        }
        res.send(result);
    }catch(err){
        return res.status(422).send(err.message);
    }
}

const createWeekly = async (req, res) => {
    const weekly = await WeeklyPlaylist.find().sort({'time': -1}).limit(1);
    const nowTime = new Date();
    const weeklyTime = new Date(weekly[0].time);
    const betweenTime = Math.floor((nowTime.getTime() - weeklyTime.getTime()) / 1000 / 60);
    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);    
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    if(betweenTimeDay < 7){
        res.send(weekly)
        return
    } else {
        try {
            // update weekly 
            const weeklyPlaylist = WeeklyPlaylist({playlist: [], time});
            const weeklyDaily = WeeklyDaily({daily: [], time})
            await Promise.all([
                Playlist.updateMany({ isWeekly: false }),
                Daily.updateMany({ isWeekly: false, nominate: 0 })
            ])
            const [playlist, daily] = await Promise.all([
                Playlist.find({}, {likes:1 ,views: 1, nominate: 1 }),
                Daily.find({}, {likes: 1, views: 1, nominate: 1})
            ])
            playlist.sort(function(a, b) {
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  > (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2))  return -1;
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  < (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2)) return 1;
                return 0;
            });
            daily.sort(function(a, b) {
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  > (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2))  return -1;
                if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  < (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2)) return 1;
                return 0;
            })

            const selectedPlaylist = playlist.slice(0,10);
            selectedPlaylist.forEach(async (item, index) => {
                try{
                    weeklyPlaylist.playlist.push(item._id)
                    await Playlist.findOneAndUpdate({ _id:item._id }, {$inc: { nominate:1 }, $set: { isWeekly: true}});
                    if(index == selectedPlaylist.length-1)  await weeklyPlaylist.save();
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            });
            const selectedDaily = daily.slice(0, 10);
            selectedDaily.forEach(async (item, index) => {
                try {
                    weeklyDaily.daily.push(item._id)
                    await Daily.findOneAndUpdate({ _id: item._id }, { $inc: { nominate: 1 }, $set: { isWeekly: true } });
                    if(index == selectedDaily.length-1) await weeklyDaily.save()
                } catch (err) {
                    return res.status(422).send(err.message);
                }
            })
            res.send(weekly)
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
}

const getWeekly = async (req, res) => {
    try{
        const playlists = await Playlist.find({ isWeekly: true }, { title: 1, hashtag: 1, image: 1 }).populate('postUserId', { name: 1, profileImage: 1 })
        const dailies = await Daily.find({ isWeekly: true }, { song: 1, image: 1 }).populate('postUserId', { name: 1, profileImage: 1 })
        const result = [
            playlists,
            dailies
        ]
        res.send(result);
    }catch(err){
        return res.status(422).send(err.message);
    }
}

const getRecentPlaylist = async (req, res) => {
    var nowTime = new Date()
    try {
        const playlists = await Playlist.find({"accessedTime": {$exists:true}}, {postUserId: 1, title: 1, accessedTime: 1, image: 1, hashtag: 1}).populate('postUserId', {name: 1, profileImage: 1})
        playlists.sort(function(a, b) {
            if(nowTime.getTime() - a.accessedTime.getTime() > nowTime.getTime() - b.accessedTime.getTime())  return 1;
            if(nowTime.getTime() - a.accessedTime.getTime() < nowTime.getTime() - b.accessedTime.getTime())  return -1;
            return 0;
        });
        const result = playlists.slice(0, 10)
        res.send(result)
    } catch (err) {
        return res.status(422).send(err.message);   
    }
}

//const getMusicArchive = async (req, res) => {
//    try {
//        const songs = await Song.aggregate([{
//            $group: {
//                _id: "$boardId",
//                songs: {$push: {song: "$song", id: "$_id", likes: "$likes", postUser: "$postUserId"}},
//            }
//        }])
//        const archive = await Board.populate(songs, {path: "_id" })
//        archive.sort(() => Math.random() - 0.5)
//        for(let key in archive) {
//            // except explicit songs
//            archive[key].songs = archive[key].songs.filter(({ song }) => song.attributes.contentRating !== 'explicit')
//            archive[key].songs.sort(() => Math.random() - 0.5)
//        }
//        res.send(archive)
//    } catch (err) {
//        return res.status(422).send(err.message);   
//    }
//}

module.exports = {
    getWeeklyPlaylist,
    createWeekly,
    getWeekly,
    getRecentPlaylist,
    //getMusicArchive
}