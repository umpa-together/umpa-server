const request = require('request');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const privateKey = fs.readFileSync("./AuthKey_Z5A9D27GU8.p8");

const token = jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: process.env.issuerId, //your 10-character Team ID, obtained from your developer account
    header: {
      alg: "ES256",
      kid: process.env.apiKeyId //your MusicKit Key ID
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
            const next = await JSON.parse(body).results.songs.next;
            const result = await JSON.parse(body).results.songs.data;
            res.send([result, next]);
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
            const next = await JSON.parse(body).results.artists;
            const result = await JSON.parse(body).results.artists.data;
            res.send([result,next]);
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
            const next = await JSON.parse(body).results.albums;
            const result = await JSON.parse(body).results.albums.data
            res.send([result,next]);
        });
    }catch (err) {
        return res.status(422).send(err.message);
    }
}

const searchNext = async (req, res) => {
    const tmp = req.params.next;
    try { 
        let appleOption = {
            url: 'https://api.music.apple.com/v1/catalog/kr/search?' + tmp,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + token
            },
            qs: {
                limit: 20,
            }
        }
        request(appleOption, async (err, response, body) => {
            if(tmp[tmp.length-2] == 'g'){
                const next = await JSON.parse(body).results.songs.next;
                body = await JSON.parse(body).results.songs.data;
                res.send([body, next]);
            }else{
                const next = await JSON.parse(body).results.artists.next;
                body = await JSON.parse(body).results.artists.data;
                res.send([body, next]);
            }
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
            res.send(body);
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
