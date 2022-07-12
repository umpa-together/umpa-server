const mongoose = require('mongoose');
const RecentKeyword = mongoose.model('RecentKeyword');
const request = require('request');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const privateKey = fs.readFileSync("./AppleMusic_AuthKey.p8");

const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: process.env.APPLEMUSIC_ISSUER_ID, //your 10-character Team ID, obtained from your developer account
    header: {
      alg: "ES256",
      kid: process.env.APPLEMUSIC_API_KEY_ID //your MusicKit Key ID
    }
});

const searchSong = async (req, res) => {
    try {
        let appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                term: req.params.songname,
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            const song = await JSON.parse(body).results.songs;
            const keyword = await RecentKeyword.findOne({
                $and: [{
                    keyword: req.params.songname,
                }, {
                    postUserId: req.user._id
                }]
            })
            if(keyword) {
                await RecentKeyword.findOneAndUpdate({
                    keyword: req.params.songname
                }, {
                    $set: {
                        time: new Date()
                    }
                }, {
                    new: true
                })
            } else {
                await new RecentKeyword({
                    keyword: req.params.songname,
                    postUserId: req.user._id,
                    time: new Date()
                }).save()
            }
            if (song !== undefined) {
                const [next, result] = await Promise.all([
                    JSON.parse(body).results.songs.next,
                    JSON.parse(body).results.songs.data
                ])
                res.status(200).send([result, next !== undefined ? next.substr(22) : null]);
            } else {
                res.status(200).send([[], null]);
            }
        });
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const searchArtist = async (req, res) => {
    try{
        let appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search',
            method: 'GET',
            headers: {
                'Authorization' : 'Bearer ' + token
            },
            qs: {
                term: req.params.artistname,
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            const artist = await JSON.parse(body).results.artists;
            if (artist !== undefined) {
                const [next,result] = await Promise.all([
                    JSON.parse(body).results.artists.next,
                    JSON.parse(body).results.artists.data
                ])
                res.status(200).send([result, next !== undefined ? next.substr(22) : null]);
            } else {
                res.status(200).send([[], null]);
            }
        });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const searchAlbum = async (req, res) => {
    try{
        let appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                term: req.params.albumname,
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            const albums = await JSON.parse(body).results.albums;
            if (albums !== undefined) {
                const [next, result] = await Promise.all([
                    JSON.parse(body).results.albums.next,
                    JSON.parse(body).results.albums.data
                ])
                res.status(200).send([result, next !== undefined ? next.substr(22) : null]);
            } else {
                res.status(200).send([[], null]);
            }
        });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const searchNext = async (req, res) => {
    const kind = req.params.next;
    let next = '';
    try { 
        let appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search?' + kind,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            if (kind[kind.length-2] == 'g'){
                [next, body] = await Promise.all([
                    JSON.parse(body).results.songs.next,
                    JSON.parse(body).results.songs.data
                ])
            } else if (kind[kind.length-2] == 't') {
                [next, body] = await Promise.all([
                    JSON.parse(body).results.artists.next,
                    JSON.parse(body).results.artists.data
                ])
            } else {
                [next, body] = await Promise.all([
                    JSON.parse(body).results.albums.next,
                    JSON.parse(body).results.albums.data
                ])
            }
            res.status(200).send([body, next !== undefined ? next.substr(22) : null]);
        });
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

const searchHint = async (req, res) => {
    try {
        let appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search/hints?',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                term: req.params.term,
                limit: 10,
            }
        }
        request(appleOption, async (err, response, body) => {
            body = await JSON.parse(body).results.terms;
            res.status(200).send(body);
        })
    } catch (err) {
        return res.status(422).send(err.message);
    }
}

module.exports = {
    searchSong,
    searchArtist,
    searchAlbum,
    searchNext,
    searchHint,
}