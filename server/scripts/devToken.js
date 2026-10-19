// server/scripts/devToken.js  (dev only, don't commit)
require('dotenv').config();
const jwt = require('jsonwebtoken');
console.log(jwt.sign({ id: process.argv[2], role: 'customer' }, process.env.JWT_SECRET, { expiresIn: '1d' }));