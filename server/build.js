const rollup = require('rollup');
const debug = require('debug')('rollup');

// set to avoid production builds
process.env.ROLLUP_WATCH = true;

const config = require('../rollup.config.js');
const watcher = rollup.watch(config);
watcher.on('event', e => {
    debug('event', e.code);
});
