const debug = require('debug')('reload');
const chokidar = require('chokidar');
const WebSocket = require('ws');
const path = require('path');

let reloader_broadcast;

function start({dirpath, port}) {
    const wss = new WebSocket.Server({port});
    wss.on('connection', ws => {
        debug('opened', wss.clients.size);
        ws.on('close', function() {
            debug('closed', wss.clients.size);
        });
    });

    function broadcast(msg) {
        msg = JSON.stringify(msg);
        let count = 0;
        wss.clients.forEach(c => {
            if (c.readyState === WebSocket.OPEN) {
                c.send(msg);
                ++count;
            }
        });
        return count;
    }

    const watcher = chokidar.watch('.', {
        cwd: dirpath,
        ignoreInitial: true,
    });

    watcher.on('ready', () => {
        debug('ready: watching', dirpath);
    });

    watcher.on('all', (event, filepath) => {
        debug(event, filepath);
        const pathname = '/' + filepath;

        // broadcast this
        broadcast({
            event,
            path: pathname,
            ext: path.extname(filepath),
        });
    });
}

module.exports = start;
