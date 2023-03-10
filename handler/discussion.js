'use strict';

let db = require('../db');
let config = require('../config');
let utils = require('../utils');

let handler = (req, res) => {
    let conn = db.getConn();
    let data = {
        lang: config.lang,
        discussion_id: req.params.id,
        url: req.url
    };

    // Fetch the login status
    data.loginInfo = req.logined ? req.loginInfo : {};

    // Get all the posts under the discussion by discussion id.
    conn.query({
        sql: [
            'SELECT posts.type, posts.content, posts.created_at, posts.user_id, posts.type, ',
            '       discussions.title,',
            '       users.avatar_url, users.username',
            'FROM posts',
            'INNER JOIN users',
            'ON users.id = posts.user_id',
            'INNER JOIN discussions',
            'ON discussions.id = discussion_id',
            'WHERE discussions.id = ? AND posts.hidden_user_id IS NULL;',
        ].join(' '),
        values: [req.params.id]
    }, (err, table) => {
        if (err) {
            res.status(500);
            res.render('error', {code: '500', msg: 'MySQL Error.'});
            return;
        }
        if (table.length == 0) {
            res.status(404);
            res.render('error', {code: '404', msg: 'No Such Discussion.'});
            return;
        }
        // Reconstruct the structure of post list.
        data.posts = table.map(row => {
            let post = {
                userName: row.username,
                date: utils.formatDate(row.created_at) + ' ' + utils.formatTime(row.created_at),
                content: row.content
                    // .replace(/<[s|e]>([^]+?)<\/[s|e]>/g, () => '')
                    // .replace(/<IMG ([^]+?)>([^]+?)<\/IMG>/g, (match, p1) => `<a href="/imgProxy?url=${ encodeURIComponent(p1.match(/src="([^]+?)"/)[1]) }" target="_blank" class="img"><font color="#337000"><b><i>点击此处打开图片</i></b></font></a>`)
                    // .replace(/<URL url="([^]+?)">([^]+?)<\/URL>/g, (match, p1, p2) => `<a href="${p1}">${p2}</a>`)
                    // .replace(/<CODE>([^]+?)<\/CODE>/, (match, p1) => `<pre><code>${p1}</code></pre>`)
                    // .replace(/<C>\$\$([^]+?)\$\$<\/C>/g, (match, expr) => `<img src="/KaTeX/${encodeURIComponent(expr)}"></img>`)
                    // .replace(/<HR>([^]+?)<\/HR>/g, () => '<hr />')
                    // .replace(/@(.+?)#\d+/, (match, p1) => `<font size="3" color="#337000">${config.lang.replyTo}${p1}:</font> `)
                    //.replace(/<USERMENTION ([^]+?)>([^]+?)<\/USERMENTION>/, (match, p1, p2) => `<a href="/u/${ p1.match(/username="(.+?)"/)[1] }" class="mention">${ p2 }</a>`)
                    .replace('{"sticky":true}', (match, p1) => '置顶了此贴')
                    .replace('{"sticky":false}', (match, p1) => '取消置顶了此贴'),
                avatarPath: '/assets/avatars/' + (row.avatar_url || 'default.jpg')
            };

            if (row.type === 'discussionRenamed') {
                let nameArray = JSON.parse(row.content);
                post.content = '修改标题成 <strong>' + nameArray[1] + '</strong>';
            }

            return post;
        });

        // Update discussion title.
        data.title = table[0].title;

        // Render the page and send to client.
        res.render('discussion', data);
    });
};

module.exports = handler;
