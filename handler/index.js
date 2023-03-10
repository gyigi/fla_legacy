'use strict';

let db = require('../db');
let config = require('../config');
let utils = require('../utils');

let handler = (req, res) => {
    // Check if the user is searching.
    if (req.query.q) {
        require('./search')(req, res);
        return;
    }

    // Storage the data that will be passed to the render engine.
    let data = {
        lang: config.lang,
        title: `${config.lang.index} - ${config.lang.siteTitle}`,
    };

    // Fetch the login status
    data.loginInfo = req.logined ? req.loginInfo : {};

    // Fetch all the tags' information from database.
    let conn = db.getConn();
    conn.query({
        sql: 'SELECT name, color, id, slug FROM tags'
    }, (err, table) => {
        if (err) {
            res.render('error', {code: '500', msg: 'MySQL Error.'});
            return;
        }
        data.tags = table.map(item => {
            return {
                name: item.name,
                color: item.color,
                id: item.id,
                href: '/t/' + item.slug,
            };
        });

        // Fetch the discussions <-> tags table.
        conn.query({
            sql: 'SELECT * FROM discussion_tag;'
        }, (err, table) => {
            if (err) {
                res.render('error', {code: '500', msg: 'MySQL Error.'});
                return;
            }
            let tagMap = {};
            let getTagNameById = (id) => {
                let result;
                data.tags.forEach(tag => {
                    if (tag.id == id)
                        result = tag.name;
                });
                return result;
            };

            table.forEach(row => {
                if (!tagMap[row.discussion_id]) {
                    tagMap[row.discussion_id] = [getTagNameById(row.tag_id)];
                }
                else {
                    tagMap[row.discussion_id].push(getTagNameById(row.tag_id));
                }
            });
            // Now is the content of index.
            conn.query({
                sql: [
                    'SELECT discussions.id, title, slug,',
                    '       discussions.comment_count, last_posted_at,',
                    '       user_id, last_posted_user_id,',
                    '       is_sticky,',
                    '       user1.avatar_url, user1.username as start_user_name,',
                    '       user2.username as last_user_name',
                    'FROM  discussions',
                    'INNER JOIN users user1',
                    '   ON user1.id = user_id',
                    'INNER JOIN users user2',
                    '   ON user2.id = last_posted_user_id',
                    'WHERE discussions.comment_count != 0',
                    'AND   discussions.hidden_at IS NULL',
                    'ORDER BY discussions.last_posted_at DESC',
                ].join(' '),
            }, (err, table) => {
                if (err) {
                    res.render('error', {code: '500', msg: 'MySQL Error.'});
                    return;
                }
                data.topics = table.map(item => {
                    return {
                        title: item['title'],
                        id: item['id'],
                        startUser: {
                            avatarPath: '/assets/avatars/' + (item['avatar_url'] || 'default.jpg'),
                            name: item['start_user_name'],
                        },
                        lastUser: {
                            name: item['last_user_name'],
                        },
                        lastDate: utils.formatDate(item['last_posted_at']),
                        replyCnt: item['comment_count'] - 1,
                        
                            href: `/d/${item['id']}-${item['slug']}`,

                        isSticky: item['is_sticky'],
                        //tagList: `[${tagMap[item['id']].join('|')}]`
                    };
                });

                // Deal with those posts that is sticky
                let sticky = [];
                for (let i = 0; i < data.topics.length; ++i) {
                    if (data.topics[i].isSticky) {
                        sticky.push(data.topics[i]);
                        data.topics.splice(i, 1);
                    }
                }

                data.topics = sticky.concat(data.topics);

                let currentPage = data.currentPage = req.query.page || 1; currentPage--;
                data.maxPages = Math.floor(data.topics.length / config.postsPerPage) + (data.topics.length % config.postsPerPage === 0 ? 0 : 1);
                data.topics = data.topics.slice(currentPage * config.postsPerPage, Math.min((currentPage + 1) * config.postsPerPage, data.topics.length));

                // Render the page and send to client.
                res.render('index', data);
                // res.send('ok');
            });
        });
    });
};

module.exports = handler;
