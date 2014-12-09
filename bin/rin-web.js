#!/usr/bin/env node

var prpr = require('../rin');

var config = require('../config');

var server = prpr.listen(
    process.env.PORT || config['web'].bindPort || 3000,
    config['web'].bindAddress || '::',
    function () {
        console.log('Let\'s prpr on ' +
            server.address().address +
            ' port ' + server.address().port +
            ' ( > ◡╹)'
        );
    }
);
