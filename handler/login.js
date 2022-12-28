'use strict';

let config = require('../config');
let utils = require('../utils');
let request = require('request');
request.defaults({jar: true});
function getHandler(req, res) {
    res.render('login');
}

let postHandler = (req, res) => {
    let server = {req, res};
    
    utils.log(`[INFO][login.js] Login request received, remote user name: ${req.body.username}`);
    request.post({
        url: `${config.origUrl}/api/token`,
        header: {
            'Content-Type': 'application/json; charset=UTF-8'
        },
        json: true,
        body: {
            identification: req.body.username,
            password: req.body.password
        }
    }, (err, res, body) => {
        if (typeof body.errors === 'undefined') {
            server.res.cookie('access_token', body.token, {
                path: '/',
                httpOnly: true,
                expires: new Date(Date.now() + 2678400000)
            });
            server.res.redirect(301, '/');
            utils.log(`Success！`);
        }
        else {
            server.res.render('login', {msg: '错误的用户名或密码'});
        }
    });
};

module.exports = {
    get: getHandler,
    post: postHandler,
};
