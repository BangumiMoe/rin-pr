"use strict";

/**
 * lib/mailer.js
 * Rin prpr!
 *
 * rin-pr mailer
 */

var config = require('../config');

var nodemailer = require('nodemailer');
var fs = require('fs');

var transporter = nodemailer.createTransport({
    service: config['mail'].service,
    auth: {
        user: config['mail'].user,
        pass: config['mail'].password
    }
});

/*
* mailer params
* receiver: string 'someone@example.com'
* language: string 'zh_tw'
* mailtemplate: string 'reg_confirmation'
* locals: object { someVar: "someVal" }
*
* */

module.exports = function (receiver, language, mailtemplate, locals) {
    return function (callback) {
        fs.readFile(config['app'].root_dir  + 'lib/mails/' + language + '/' + mailtemplate + '.mt', 'utf8', function(err, data) {
            if (err) {
                return callback(err);
            }

            for (var key in locals) {
                data = data.replace('<' + key + '>', locals[key]);
            }

            var subject = data.slice(0, data.indexOf('\n'));
            var body  = data.slice(data.indexOf('\n') + 1);

            var mailOptions = {
                from: config['mail'].sender,
                to: receiver,
                subject: subject,
                text: body
            };

            if (config['app'].dev_mode) {
                console.log('message not really sent to ' +
                    receiver +
                    '\nsubject: '
                    + mailOptions.subject +
                    '\n' + mailOptions.text
                );
                callback(null, { success: true });
            } else {
                transporter.sendMail(mailOptions, function(err){
                    if (err) {
                        callback(null, { success: false, message: err });
                    } else {
                        callback(null, { success: true });
                    }
                });
            }
        });
    };
};
