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
            const song = await JSON.parse(body).results.songs;
            if (song !== undefined) {
                const next = await JSON.parse(body).results.songs.next;
                const result = await JSON.parse(body).results.songs.data;
                res.send([result, next !== undefined ? next.substr(22) : null]);
            } else {
                res.send([[], null]);
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
                const next = await JSON.parse(body).results.artists.next;
                const result = await JSON.parse(body).results.artists.data;
                res.send([result, next !== undefined ? next.substr(22) : null]);
            } else {
                res.send([[], null]);
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
                const next = await JSON.parse(body).results.albums.next;
                const result = await JSON.parse(body).results.albums.data;
                res.send([result, next !== undefined ? next.substr(22) : null]);
            } else {
                res.send([[], null]);
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
                next = await JSON.parse(body).results.songs.next;
                body = await JSON.parse(body).results.songs.data;
            } else if (kind[kind.length-2] == 't') {
                next = await JSON.parse(body).results.artists.next;
                body = await JSON.parse(body).results.artists.data;
            } else {
                next = await JSON.parse(body).results.albums.next;
                body = await JSON.parse(body).results.albums.data;
            }
            res.send([body, next !== undefined ? next.substr(22) : null]);
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