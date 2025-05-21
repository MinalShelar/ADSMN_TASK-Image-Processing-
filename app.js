const express = require('express');
const app = express();
const userRoutes = require('./route/user');
const path = require('path');

app.use(express.json());
app.use('/scorecards', express.static(path.join(__dirname, 'public/scorecards')));
app.use('/', userRoutes);

app.listen(3000, () => console.log('Server running on port 3000'));