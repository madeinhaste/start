const fs = require('fs');
const https = require('https');
const express = require('express');
const morgan = require('morgan');
const debug = require('debug')('server');
const bodyparser = require('body-parser');
const bodyparser_msgpack = require('./body-parser-msgpack');

const PORT = 8000;
const RELOADER_PORT = 8001;
const static_root = './public';

const app = express();
app.use(morgan('dev'));
app.use(bodyparser.json());
app.use(bodyparser_msgpack());
//app.use(bodyparser.urlencoded({extended: true});

app.use(express.static(static_root, {extensions: ['html']}));

require('./reload')({
    dirpath: static_root,
    port: RELOADER_PORT,
});

require('./build');

// mount api
app.use('/api', require('./api'));

app.listen(PORT, function() {
    debug(`listening on port ${PORT}`);
});
