/**
 * Created by xx on 16/3/23.
 */


const router = require('koa-router')();
const fs = require('fs');
const path = require('path');
const debug = require('debug')('app:router');
const botInstance = require('./wc-instance');

import  Wechat from './wechat';

module.exports = function routers(app, config) {

    router.get('/', function (ctx, next) {
        ctx.type = 'text/html';
        ctx.body = fs.createReadStream(path.join(config.staticPath, 'index.html'));

    });

    router.get('/uuid', async function (ctx, next) {
        let bot = new Wechat();
        const uuid = await bot.getUUID();
        botInstance.set(uuid, bot);
        ctx.body = {uuid: uuid};
    });


    router.get('/login/:uuid', async function (ctx, next) {
        let bot = botInstance.get(ctx.params.uuid);
        if (!bot) return ctx.redirect("/");
        if(bot.wait) clearTimeout(bot.wait);
        bot.wait = setTimeout(() => {     //5min后自动销毁
            debug("clear bot instance");
            botInstance.delete(ctx.params.uuid);
        }, 60 * 1000 * 5);

        ctx.body = await bot.start()
            .then(() => {
                debug('success login');
                clearTimeout(bot.wait);
                bot.on('logout', () => {
                    debug("logout", ctx.params.uuid);
                    bot.socket.disconnect();
                    botInstance.delete(ctx.params.uuid);
                });
                return {status: 0};
            })
            .catch(err => {
                debug('login err', err);
                return {status: 1};
            });
    });


    router.get('/friends/:uuid', async function (ctx, next) {
        let bot = botInstance.get(ctx.params.uuid);
        if (bot && bot.state === Wechat.STATE.login) {
            ctx.body = {status: 0, friends: bot.friends};
        } else {
            ctx.body = {status: 1};
        }
    });

    router.get('/robot/:uuid', async function (ctx, next) {
        debug("toggle robot");
        let bot = botInstance.get(ctx.params.uuid);
        debug(`robot :${bot}` );
        if (bot) {
            bot.openRobot = ! bot.openRobot;
            ctx.body = {status: 0, open: bot.openRobot};
        } else {
            ctx.body = {status: 1};
        }

    });


    app
        .use(router.routes())
        .use(router.allowedMethods());


};