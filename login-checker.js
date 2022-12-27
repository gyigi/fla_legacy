'use strict';

let db = require('./db');
let utils = require('./utils');

let middleware = (req, res, next) => {
    // Check if cookie named access_token exist
    if (typeof req.cookies.access_token === 'undefined') {
        req.logined = false;
        next();
        return;
    }
    else {
        let conn = db.getConn();

        // Get more info about the access_token
        conn.query({
            sql: [
                'SELECT access_tokens.id, access_tokens.user_id, access_tokens.last_activity_at,',
                '       users.username, users.avatar_url', //access_tokens.lifetime
                'FROM   access_tokens ',
                'INNER JOIN users ',
                '        ON users.id = user_id ',
                'WHERE access_tokens.id'
            ].join(' '),
            values: [req.cookies.access_token]
        }, (err, table) => {
            if (err) {
                res.render('error', {code: '500', msg: 'MySQL Error.'});
                utils.log(err);
                return;
            }
            if (table.length !== 1) {
                req.logined = false;
                next();
                return;
            }
            else {
                let tokenInfo = {
                    id: table[0].id,
                    userId: table[0].user_id,
                    userName: table[0].username,
                    lastActivity: table[0].last_activity,
                    // lifetime: table[0].lifetime,
                    avatar: '/assets/avatars/' + (table[0].avatar_url || 'default.jpg'),
                };
                // Check if expired.
                if (Math.ceil(Date.now() / 1000) >  tokenInfo.lastActivity) { //tokenInfo.lifetime +
                    // Expired.
                    req.logined = false;
                    next();
                    return;
                }
                else {
                    // Seems that the token is valid. Let him pass.
                    req.logined = true;
                    req.loginInfo = {
                        username: tokenInfo.userName,
                        avatar: tokenInfo.avatar
                    };
                    next();
                }
            }
        });
    }
};

module.exports = middleware;