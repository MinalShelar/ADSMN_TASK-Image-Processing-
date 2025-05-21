const express = require('express');
const router = express.Router();
const userController = require('../controller/user');

router.post('/send-otp', userController.sendOtp);
router.post('/register', userController.register);
router.post('/save-score', userController.saveScore);
router.get('/scorecard/:userId', userController.getScoreCard); // needs to be used User encrypted ID here
router.get('/weekly-score/:userId', userController.getWeeklyScores); // / needs to be used User encrypted ID here

module.exports = router;