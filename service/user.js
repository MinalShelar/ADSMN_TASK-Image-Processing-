const db = require('../config/db');
const moment = require('moment');
const { encryptUserId } = require('../utils/encrypt');

exports.sendOtp = async (phone) => {
  try {
    const expiresAt = moment().add(1, 'minute').format('YYYY-MM-DD HH:mm:ss');
    await db.execute('INSERT INTO otps (phone, otp, expires_at) VALUES (?, ?, ?)', [phone, '1234', expiresAt]);
  } catch (error) {
    console.error('Error in sendOtp:', error);
    throw error;
  }
};

exports.registerUser = async ({ phone, name, dob, email, otp }) => {
  try {
    const [existing] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
    if (existing.length > 0) {
      const error = new Error('Phone number already registered');
      error.statusCode = 400;
      throw error;
    }

    const [otpRow] = await db.execute('SELECT * FROM otps WHERE phone = ? ORDER BY created_at DESC LIMIT 1', [phone]);
    if (!otpRow.length || otpRow[0].otp !== otp || new Date(otpRow[0].expires_at) < new Date()) {
      const error = new Error('Invalid or expired OTP');
      error.statusCode = 400;
      throw error;
    }

    await db.execute('INSERT INTO users (phone, name, dob, email) VALUES (?, ?, ?, ?)', [phone, name, dob, email]);
    const [userRow] = await db.execute('SELECT id FROM users WHERE phone = ?', [phone]);
    return encryptUserId(userRow[0].id);
  } catch (error) {
    console.error('Error in registerUser:', error);
    throw error;
  }
};

exports.saveScore = async (userId, score) => {
  try {
    if (score < 50 || score > 500) {
      const error = new Error('Score must be between 50 and 500');
      error.statusCode = 400;
      throw error;
    }

    const [users] = await db.execute('SELECT id FROM users');
    const user = users.find(u => encryptUserId(u.id) === userId);
    if (!user) {
      const error = new Error('Invalid user');
      error.statusCode = 400;
      throw error;
    }

    const [scoreCount] = await db.execute('SELECT COUNT(*) AS count FROM scores WHERE user_id = ? AND DATE(created_at) = CURDATE()', [user.id]);
    if (scoreCount[0].count >= 3) {
      const error = new Error('Score limit reached for today');
      error.statusCode = 400;
      throw error;
    }

    await db.execute('INSERT INTO scores (user_id, score) VALUES (?, ?)', [user.id, score]);
  } catch (error) {
    console.error('Error in saveScore:', error);
    throw error;
  }
};

exports.getScoreCardData = async (userId) => {
  try {
    const [users] = await db.execute('SELECT id, name FROM users');
    const user = users.find(u => encryptUserId(u.id) === userId);
    if (!user) {
      const error = new Error('Invalid user');
      error.statusCode = 400;
      throw error;
    }

    const [scoreData] = await db.execute('SELECT SUM(score) AS total FROM scores WHERE user_id = ?', [user.id]);
    const [ranks] = await db.execute('SELECT user_id, SUM(score) as total FROM scores GROUP BY user_id ORDER BY total DESC');

    return {
      name: user.name,
      rank: ranks.findIndex(r => r.user_id === user.id) + 1,
      totalScore: scoreData[0].total || 0
    };
  } catch (error) {
    console.error('Error in getScoreCardData:', error);
    throw error;
  }
};

exports.getWeeklyScores = async (userId) => {
  try {
    const startDate = moment('2025-04-18');
    const [users] = await db.execute('SELECT id FROM users');
    const user = users.find(u => encryptUserId(u.id) === userId);
    if (!user) {
      const error = new Error('Invalid user');
      error.statusCode = 400;
      throw error;
    }

    const [scores] = await db.execute('SELECT score, created_at FROM scores WHERE user_id = ?', [user.id]);
    const weeks = {};
    scores.forEach(({ score, created_at }) => {
      const weekNo = Math.floor(moment(created_at).diff(startDate, 'days') / 7) + 1;
      weeks[weekNo] = (weeks[weekNo] || 0) + score;
    });

    const [allScores] = await db.execute('SELECT user_id, score, created_at FROM scores');
    const allUserWeeklyTotals = {};
    allScores.forEach(({ user_id, score, created_at }) => {
      const weekNo = Math.floor(moment(created_at).diff(startDate, 'days') / 7) + 1;
      allUserWeeklyTotals[weekNo] = allUserWeeklyTotals[weekNo] || {};
      allUserWeeklyTotals[weekNo][user_id] = (allUserWeeklyTotals[weekNo][user_id] || 0) + score;
    });

    return Object.entries(weeks).map(([weekNo, totalScore]) => {
      const sorted = Object.entries(allUserWeeklyTotals[weekNo] || {}).sort(([, a], [, b]) => b - a);
      const rank = sorted.findIndex(([uid]) => parseInt(uid) === user.id) + 1;
      return { weekNo: +weekNo, rank, totalScore };
    });
  } catch (error) {
    console.error('Error in getWeeklyScores:', error);
    throw error;
  }
};
