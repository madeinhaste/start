let ws;
let hooks = [];

export function add_reload_hook(func) {
    hooks.push(func);
}

function start_reloader() {
    ws = new WebSocket('ws://localhost:8001');
    ws.onopen = e => {
        //console.log('reload:ws: open');
    };
    ws.onclose = e => {
        //console.log('reload:ws: close');
    };
    ws.onerror = e => {
        //console.log('reload:ws: error', e);
    };
    ws.onmessage = e => {
        const o = JSON.parse(e.data);
        //console.log('reload:ws: message', o);
        dispatch(o);
    };
}

function dispatch({event, path, ext}) {
    hooks.forEach(hook => hook({event, path, ext}));

    switch (ext) {
    case '.js': {
        const s = find_script_by_path(path);
        if (s) {
            //console.log('script:', path);
            window.location.reload();
        }
        break;
    }

    case '.css': {
        const ss = find_stylesheet_by_path(path);
        ss && (ss.ownerNode.href = ss.ownerNode.href);
        break;
    }

    default:
        //console.log('reload: ignored ', event, path);
        break;
    }
}

function find_script_by_path(path) {
    const url = document.createElement('a');

    for (let i = 0; i < document.scripts.length; ++i) {
        var s = document.scripts[i];
        if (!s.src)
            continue;

        url.href = s.src;
        if (url.pathname == path)
            return s;
    }

    return null;
}

function find_stylesheet_by_path(path) {
    const url = document.createElement('a');

    for (let i = 0; i < document.styleSheets.length; ++i) {
        var ss = document.styleSheets[i];
        if (!ss.href)
            continue;

        url.href = ss.href;
        if (url.pathname == path)
            return ss;
    }

    return null;
}

if (window.location.port == '8000')
    start_reloader();
