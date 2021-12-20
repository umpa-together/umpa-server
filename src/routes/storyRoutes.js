const express = require('express');
const router = express.Router();

const {
    postStory,
    deleteStory,
    getMyStory,
    getOtherStoryWithAll,
    getOtherStoryWithFollowing,
    readStory,
    getStoryCalendar
} = require('../controllers/story')

router.post('/', postStory);
router.delete('/:storyId', deleteStory);
router.get('/', getMyStory);
router.get('/other', getOtherStoryWithAll);
router.get('/following', getOtherStoryWithFollowing)
router.put('/:storyId', readStory)
router.get('/calendar/:userId', getStoryCalendar);

module.exports = router;