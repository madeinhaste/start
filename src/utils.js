export const assert = console.assert;

export const $ = s => document.querySelector(s);
export const $$ = s => document.querySelectorAll(s);

// qs('.foo')
// qs('.foo', true)
// qs(el, '.foo')
// qs(el, '.foo', true)
export function qs(...args) {
    let el, sel, all;

    switch (args.length) {
    case 1:
        assert(typeof args[0] == 'string');
        el = document;
        sel = args[0];
        all = false;
        break;
    case 2:
        if ((args[0] instanceof Document) ||
            (args[0] instanceof Element))
        {
            assert(typeof args[1] == 'string');
            el = args[0];
            sel = args[1];
            all = false;
        }
        else {
            assert(typeof args[0] == 'string');
            assert(typeof args[1] == 'boolean');
            el = document;
            sel = args[0];
            all = args[1];
        }
        break;
    case 3:
        {
            assert((args[0] instanceof Document) ||
                   (args[0] instanceof Element));
            assert(typeof args[1] == 'string');
            assert(typeof args[2] == 'boolean');
            el = args[0];
            sel = args[1];
            all = args[2];
        }
        break;
    default:
        assert(args.length < 3);
        break;
    }

    return all ?
        Array.from(el.querySelectorAll(sel)) :
        el.querySelector(sel);
}

export const HTML = (chunks, ...args) => {
    let html = '';
    chunks.forEach((chunk, i) => {
        html += chunk + (args[i] || '');
    });
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstChild;
};

export function redraw_func(callback) {
    let queued = false;
    return function redraw() {
        if (queued)
            return;

        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            callback();
        });
    }
}

export function resize_canvas_to_client_size(canvas, dpr=1) {
    //const dpr = retina ? window.devicePixelRatio : 1;
    const cw = dpr * canvas.clientWidth;
    const ch = dpr * canvas.clientHeight;

    if (canvas.width == cw && canvas.height == ch)
        return false;

    canvas.width = cw;
    canvas.height = ch;
    console.log(`resize: ${cw}x${ch} (${(cw/ch).toFixed(3)})`);
    return true;
}

export function get_selector_or_element(selector_or_element) {
    if (typeof selector_or_element == 'string')
        return document.querySelector(selector_or_element);
    else if (selector_or_element instanceof HTMLElement)
        return selector_or_element;
    else
        return null;
}

export const lerp = (a, b, u) => (1-u)*a + u*b;
export const clamp = (x, a, b) => x < a ? a : b < x ? b : x;
export const modulo = (x, n) => (x%n + n) % n;
export const expovariate = mu => -Math.log(1 - Math.random()) * mu;

export function smoothstep(a, b, x) {
    x = (x - a) / (b - a);

    if (x < 0)
        x = 0;
    else if (x > 1)
        x = 1;

    return x * x * (3.0 - 2.0 * x);
}

export const PI2 = 2 * Math.PI;
export const DEG2RAD = Math.PI/180;
export const RAD2DEG = 1/DEG2RAD;

export function mat2d_get_scale(mat) {
    const c = (mat[0] + mat[3])/2;
    const s = (mat[1] - mat[2])/2;
    const scale = Math.sqrt(c*c + s*s);
    return scale;
}

export function canvas_context_transform_mat2d(ctx, mat) {
    ctx.transform(mat[0], mat[1], mat[2], mat[3], mat[4], mat[5]);
}

export function each_line(text, callback) {
    var sp = 0;
    var lineno = 0;
    while (sp < text.length) {
        var ep = text.indexOf('\n', sp);
        if (ep == -1)
            ep = text.length;

        var line = text.substr(sp, ep - sp);
        sp = ep + 1;

        callback(line, lineno++);
    }
}

export function check_nan(ob) {
    for (let i = 0; i < ob.length; ++i) {
        if (isNaN(ob[i])) {
            console.error('NaN:', ob);
            debugger;
        }
    }
}


export function save_file_as(data, filename, type) {
    type = type || 'application/octet-binary';
    let blob = new Blob([ data ], { type: type });
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(blob);
}

export class EventEmitter {
    constructor() {
        this._listeners = {};
    }

    on(name, callback) {
        let ll = this._listeners;
        let l = ll[name] || (ll[name] = []);

        let idx = l.indexOf(callback);
        if (idx >= 0)
            return false;

        l.push(callback);
        return true;
    }

    off(name, callback) {
        let l = this._listeners[name];
        if (!l)
            return false;

        let idx = l.indexOf(callback);
        if (idx < 0)
            return false;

        l.splice(idx, 1);
        return true;
    }

    emit(name, ...args) {
        let l = this._listeners[name];
        if (!l)
            return 0;

        let n = l.length;
        for (let idx = 0; idx < n; ++idx) {
            let cb = l[idx];
            cb.apply(null, args);
        }
        return n;
    }
}

export function forEachEntry(ob, func) {
    Object.keys(ob).forEach(key => func(key, ob[key]));
}

export function sleep(ms) {
    return new Promise((res, rej) => setTimeout(res, ms));
}

export function fetch_image(url) {
    return new Promise((res, rej) => {
        let img = new Image;
        img.src = url;
        img.onload = function() { res(img) };
    });
}

export function next_power_of_two(x) {
    --x;
    x |= x >> 1;
    x |= x >> 2;
    x |= x >> 4;
    x |= x >> 8;
    x |= x >> 16;
    return x + 1;
}

export function array_fill(arr, num, val) {
    if (!arr)
        arr = [];

    if (!num)
        num = arr.length;

    if (typeof val == 'function')
        for (let i = 0; i < num; ++i)
            arr[i] = val(i);
    else
        for (let i = 0; i < num; ++i)
            arr[i] = val;

    return arr;
}

export function object_map_values(ob, fn) {
    return Object.fromEntries(
        Object.entries(ob).map(([k, v], i) => [k, fn(v, k, i)]));
}


export function dropzone(el, callback) {
    el.ondragenter = function(e) {
        e.stopPropagation();
        e.preventDefault();
    };
 
    el.ondragover = function(e) {
        e.stopPropagation();
        e.preventDefault();
    };
 
    el.ondrop = function(e) {
        e.stopPropagation();
        e.preventDefault();
        on_drop(e);
    };

    function on_drop(event) {
        const dt = event.dataTransfer;
        const files = dt.files;
        const count = files.length;
 
        if (files.length != 1)
            return;
 
        const file = files[0];
        const filename = file.name;
 
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image;
            img.src = e.target.result;
            img.onload = () => callback(event, img, filename);
        };
        reader.readAsDataURL(file);
    }
}

export function shuffle(array) {
    var m = array.length, t, i;

    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}
