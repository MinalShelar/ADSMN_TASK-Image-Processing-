const userService = require('../service/user');
const Jimp = require('jimp');
const path = require('path');
const moment = require('moment');

exports.sendOtp = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) {
            return res.status(400).json({ data: {}, error: { code: 1, message: 'Phone number is required' } });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({ data: {}, error: { code: 1, message: 'Invalid phone number format' } });
        }

        await userService.sendOtp(phone);
        res.status(200).json({ data: {}, error: { code: 0, message: 'OTP sent successfully' } });
    } catch (error) {
        console.error('Error in sendOtp:', error.message || error);
        res.status(error.statusCode || 500).json({ data: {}, error: { code: 1, message: error.message || 'Internal server error' } });
    }
};

exports.register = async (req, res) => {
    try {
        const encryptedId = await userService.registerUser(req.body);
        res.status(200).json({ data: { userId: encryptedId }, error: { code: 0, message: 'User registered successfully' } });
    } catch (error) {
        console.error('Error in register:', error.message || error);
        res.status(error.statusCode || 500).json({ data: {}, error: { code: 1, message: error.message || 'Internal server error' } });
    }
};

exports.saveScore = async (req, res) => {
    try {
        const { userId, score } = req.body;
        await userService.saveScore(userId, score);
        res.status(200).json({ data: {}, error: { code: 0, message: 'Score saved successfully' } });
    } catch (error) {
        console.error('Error in saveScore:', error.message || error);
        res.status(error.statusCode || 500).json({ data: {}, error: { code: 1, message: error.message || 'Internal server error' } });
    }
};

exports.getScoreCard = async (req, res) => {
    try {
        const { userId } = req.params;
    const { name, rank, totalScore } = await userService.getScoreCardData(userId);
    const date = moment().format('Do MMMM YY');

    const image = new Jimp(1280, 720, '#ffffff');

    // Left black block
    const leftBlock = new Jimp(400, 720, '#000000');
    image.composite(leftBlock, 0, 0);

    // Fonts
    const fontWhite = await Jimp.loadFont(path.join(__dirname, '../fonts/UnnamedWhite128.fnt'));
    const fontPoppinsTitle = await Jimp.loadFont(path.join(__dirname, '../fonts/UnnamedBold.fnt')); // For "Score Card"
    const fontPoppinsName = await Jimp.loadFont(path.join(__dirname, '../fonts/Unnamed40.fnt'));  // For name
    const fontPoppinsScore = await Jimp.loadFont(path.join(__dirname, '../fonts/Unnamed.fnt')); // For score
    const fontPoppinsDate = await Jimp.loadFont(path.join(__dirname, '../fonts/UnnamedDate.fnt')); // For date

    // Left Rank Centered
    const rankText = rank.toString();
    const rankWidth = Jimp.measureText(fontWhite, rankText);
    const rankX = (400 - rankWidth) / 2;
    const rankY = (720 - 140) / 2;
    image.print(fontWhite, rankX, rankY, rankText);

    // Heights
    const titleHeight = 150;
    const nameHeight = 100;
    const scoreHeight = 50;
    const dateHeight = 50;
    const spacing = 5;

    const totalTextHeight = titleHeight + nameHeight + scoreHeight + dateHeight + (1 * spacing);
    const startY = (720 - totalTextHeight) / 2;
    let currentY = startY;

    // Score Card Title
    image.print(fontPoppinsTitle, 400, currentY, {
      text: 'Score Card',
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, 880, titleHeight);
    currentY += titleHeight + spacing;

    // Name (printed and recolored to blue)
    const nameImg = new Jimp(880, nameHeight, '#ffffff');
    nameImg.print(fontPoppinsName, 0, 0, {
      text: name,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, 880, nameHeight);
    nameImg.scan(0, 0, nameImg.bitmap.width, nameImg.bitmap.height, (x, y, idx) => {
      if (
        nameImg.bitmap.data[idx + 0] === 0 &&
        nameImg.bitmap.data[idx + 1] === 0 &&
        nameImg.bitmap.data[idx + 2] === 0
      ) {
        nameImg.bitmap.data[idx + 0] = 39;
        nameImg.bitmap.data[idx + 1] = 82;
        nameImg.bitmap.data[idx + 2] = 248;
      }
    });
    image.composite(nameImg, 400, currentY);
    currentY += nameHeight + spacing;

    // Score
    image.print(fontPoppinsScore, 400, currentY, {
      text: `Score: ${totalScore}`,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, 880, scoreHeight);
    currentY += scoreHeight + spacing;

    // Date
    image.print(fontPoppinsDate, 400, currentY, {
      text: `Date: ${date}`,
      alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER
    }, 880, dateHeight);

    const imagePath = path.join(__dirname, '../public/scorecards', `${userId}.jpg`);
    await image.writeAsync(imagePath);

    return res.status(200).json({
      data: { url: `/scorecards/${userId}.jpg` },
      error: { code: 0, message: 'Scorecard generated' }
    });

  } catch (error) {
    console.error('Error in getScoreCard:', error);
    res.status(500).json({
      data: {},
      error: { code: 1, message: error.message || 'Internal Server Error' }
    });
  }
};

exports.getWeeklyScores = async (req, res) => {
    try {
        const { userId } = req.params;
        const data = await userService.getWeeklyScores(userId);
        res.status(200).json({ data: { weeks: data }, error: { code: 0, message: 'Weekly scores fetched' } });
    } catch (error) {
        console.error('Error in getWeeklyScores:', error.message || error);
        res.status(error.statusCode || 500).json({ data: {}, error: { code: 1, message: error.message || 'Internal server error' } });
    }
};