const crypto = require('crypto');
const SECRET_KEY = 'your_secret';
exports.encryptUserId = (userId) => crypto.createHmac('sha256', SECRET_KEY).update(userId.toString()).digest('hex');
