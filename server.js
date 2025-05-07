// Use Strict Mode, Fighting Bugs I Guess
'use strict';

// Pull in http Library to run the HTTP server
const http = require('http');
// Pull in Express Framework
const express = require('express');
// Cookies (Auth atm)
const cookieParser = require('cookie-parser');
// Validator 
//const validator = require('validator');
const dotENV = require('dotenv').config();

// Import Local Modules
const CONST = require('./modules/consts.js');
const faculty = require('./routes/faculty.js');
const student = require('./routes/student.js');



/* Express JS Setup code */
const webserver = express();

// Set the Static content that the site will use
webserver.set('view engine', 'ejs');
webserver.use(express.static('public'));
webserver.use(express.static('views'));
webserver.use(express.json()); // If we are Express 4.16+ this is possible, ow use body-parser
webserver.use(express.urlencoded()); // If we are Express 4.16+ this is possible, ow modify
webserver.use(cookieParser()); // Cookies
webserver.use(faculty); // app.use() requires a middleware function
webserver.use(student); // app.use() requires a middleware function

// Creates Server using Express JS Framework!
var http_server = http.createServer(webserver)
console.log(CONST.PORT);
console.log(process.env.MONGO_URI);
http_server.listen(CONST.PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${CONST.PORT}`);
});