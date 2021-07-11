const express = require('express');
const mongoose = require('mongoose');

const Playlist = mongoose.model('Playlist');
const Curation = mongoose.model('Curation');
const Curationpost = mongoose.model('CurationPost')
const WeeklyPlaylist = mongoose.model('WeeklyPlaylist');
const WeekDJ = mongoose.model('WeekDJ');
const WeekCuration = mongoose.model('WeekCuration');
const User = mongoose.model('User');
const requireAuth = require('../middlewares/requireAuth');
require('date-utils');
const router = express.Router();
router.use(requireAuth);

// Weekly Playlist
router.post('/WeekPlaylist', async(req, res) => {
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try{
        const Weekly = WeeklyPlaylist({playlist: [], time});
        await Playlist.updateMany({isWeekly: false})
        const playlist = await Playlist.find({}, {likes:1 ,views: 1, nominate: 1 });
        playlist.sort(function(a, b) {
            if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  > (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2))  return -1;
            if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  < (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2)) return 1;
            return 0;
        });
        const selected = playlist.slice(0,10);
        selected.forEach(async (item, index) => {
            try{
                Weekly.playlist.push(item._id)
                await Playlist.findOneAndUpdate({ _id:item._id }, {$inc: { nominate:1 }, $set: { isWeekly: true}});
                if(index == selected.length-1){
                    await Weekly.save();
                    res.send(Weekly);
                }
            } catch (err) {
                return res.status(422).send(err.message);
            }
        });
    }catch(err){
        return res.status(422).send(err.message);
    } 
})

router.get('/WeekPlaylist', async(req, res) => {
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
})

// Weekly curation
router.post('/WeekCuration', async(req,res) => {
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const curations = await Curation.find();
        // init nominate
        //const curations = await Curation.updateMany({nominate:0})

        // init weekly
        //await WeekCuration.deleteMany();

        //pick weekly

        curations.sort(function(a,b) {
            return a.participate.length / ((a.nominate+1)*(a.nominate+1)/3) > b.participate.length / ((b.nominate+1)*(b.nominate+1)/3) ? -1 : a.participate.length / ((a.nominate+1)*(a.nominate+1)/3) < b.participate.length / ((b.nominate+1)*(b.nominate+1)/3) ? 1 : 0;
        });
        const result = curations.slice(0,10);
        const weeklycuration = new WeekCuration({curation: [], time});
        result.forEach(async(item, index) => {
            try {
                await Curation.findOneAndUpdate({ songoralbumid:item.songoralbumid }, {$inc: { nominate:1 }});                weeklycuration.curation.push(item._id);
                if(index == result.length-1){
                       await weeklycuration.save();
                       res.send(weeklycuration);
                 }
            } catch (err){
                return res.status(422).send(err.message);
            }
        });
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/WeekCuration', async(req,res) => {
    try{
        const curations = await WeekCuration.find().populate('curation').sort({'time':-1}).limit(1);
        res.send(curations[0].curation);
    }catch(err){
        return res.status(422).send(err.message);
    }
});

// Weekly DJ
router.post('/WeekDJ', async(req,res) => {
    var newDate = new Date()
    var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
    try {
        const users = await User.find();

        // init nominate
        // const users = await User.updateMany({nominate:0})

        // init weekly
        //await WeekCuration.deleteMany();

        //pick weekly
        var score = [];

        for (const item of users ) {
            try {
                var tempscore = 0;
                const playlists = await Playlist.find({postUserId:item._id});
                playlists.forEach((object)=>{
                        tempscore = tempscore+object.likes.length;
                });
                const curationpost = await Curationpost.find({postUserId:item._id});
                curationpost.forEach((object)=>{
                    tempscore = tempscore +object.likes.length;
                });
                tempscore = tempscore+item.follower.length+item.songsView;
                await score.push(tempscore/((item.nominate+1)*(item.nominate+1)));
            } catch (err) {
                return res.status(422).send(err.message);
            }
        };
        var index =[...score.keys()].sort((a,b)=>score[b]-score[a]).slice(0,10);
        var result = [];
        for (key in index){
            result.push(users[index[key]]);
        }
        result.forEach(async(item, index) => {
            try {
                await User.findOneAndUpdate({ _id:item._id }, {$inc: { nominate:1 }});
            } catch (err) {
                return res.status(422).send(err.message);
            }
        });
        const weekDJ = new WeekDJ({DJ: result, time});
        weekDJ.save();
        res.send(result);
    } catch (err) {
        return res.status(422).send(err.message);
    }
});

router.get('/WeekDJ', async(req,res) => {
    try{
        const weekdj = await WeekDJ.find().populate('DJ').sort({'time':-1}).limit(1);
        res.send(weekdj[0].DJ);
    }catch(err){
        return res.status(422).send(err.message);
    }
});

router.post('/Weekly', async (req, res) => {
    const weekly = await WeeklyPlaylist.find().sort({'time': -1}).limit(1);
    const nowTime = new Date();
    const weeklyTime = new Date(weekly[0].time);
    const betweenTime = Math.floor((nowTime.getTime() - weeklyTime.getTime()) / 1000 / 60);
    const betweenTimeDay = Math.floor(betweenTime / 60 / 24);
    if(betweenTimeDay < 7){
        res.send(weekly)
        return
    }else{
        try {
            // update weekly playlist
            var newDate = new Date()
            var time = newDate.toFormat('YYYY-MM-DD HH24:MI:SS');
            try{
                const weeklyPlaylist = WeeklyPlaylist({playlist: [], time});
                await Playlist.updateMany({isWeekly: false})
                const playlist = await Playlist.find({}, {likes:1 ,views: 1, nominate: 1 });
                playlist.sort(function(a, b) {
                    if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  > (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2))  return -1;
                    if((a.likes.length+Math.sqrt(a.views))/Math.pow(a.nominate+1,2)  < (b.likes.length+Math.sqrt(b.views))/Math.pow(b.nominate+1,2)) return 1;
                    return 0;
                });
                const selected = playlist.slice(0,10);
                selected.forEach(async (item, index) => {
                    try{
                        weeklyPlaylist.playlist.push(item._id)
                        await Playlist.findOneAndUpdate({ _id:item._id }, {$inc: { nominate:1 }, $set: { isWeekly: true}});
                        if(index == selected.length-1)  await weeklyPlaylist.save();
                    } catch (err) {
                        return res.status(422).send(err.message);
                    }
                });
            }catch(err){
                return res.status(422).send(err.message);
            } 
            // update weekly curation
            try {
                const curations = await Curation.find();
                curations.sort(function(a,b) {
                    return a.participate.length / ((a.nominate+1)*(a.nominate+1)/3) > b.participate.length / ((b.nominate+1)*(b.nominate+1)/3) ? -1 : a.participate.length / ((a.nominate+1)*(a.nominate+1)/3) < b.participate.length / ((b.nominate+1)*(b.nominate+1)/3) ? 1 : 0;
                });
                const result = curations.slice(0,10);
                const weeklycuration = new WeekCuration({curation: [], time});
                result.forEach(async(item, index) => {
                    try {
                        await Curation.findOneAndUpdate({ songoralbumid:item.songoralbumid }, {$inc: { nominate:1 }});                weeklycuration.curation.push(item._id);
                        if(index == result.length-1)    await weeklycuration.save()
                    } catch (err){
                        return res.status(422).send(err.message);
                    }
                });
            } catch (err) {
                return res.status(422).send(err.message);
            }
            // update weekly dj
            try {
                const users = await User.find();
                var score = [];
                for (const item of users ) {
                    try {
                        var tempscore = 0;
                        const playlists = await Playlist.find({postUserId:item._id});
                        playlists.forEach((object)=>{
                                tempscore = tempscore+object.likes.length;
                        });
                        const curationpost = await Curationpost.find({postUserId:item._id});
                        curationpost.forEach((object)=>{
                            tempscore = tempscore +object.likes.length;
                        });
                        tempscore = tempscore+item.follower.length+item.songsView;
                        await score.push(tempscore/((item.nominate+1)*(item.nominate+1)));
                    } catch (err) {
                        return res.status(422).send(err.message);
                    }
                };
                var index =[...score.keys()].sort((a,b)=>score[b]-score[a]).slice(0,10);
                var result = [];
                for (key in index){
                    result.push(users[index[key]]);
                }
                result.forEach(async(item, index) => {
                    try {
                        await User.findOneAndUpdate({ _id:item._id }, {$inc: { nominate:1 }});
                    } catch (err) {
                        return res.status(422).send(err.message);
                    }
                });
                const weekDJ = new WeekDJ({DJ: result, time});
                weekDJ.save();
            } catch (err) {
                return res.status(422).send(err.message);
            }
        res.send(weekly)
        } catch (err) {
            return res.status(422).send(err.message);
        }
    }
})


module.exports = router;