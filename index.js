'use strict';

let express = require('express');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let config = require('./config');

let app = express();

app.get('/',function(req,res){
    res.send('Hello world');
});

app.listen(config.port);