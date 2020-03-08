import H from 'hyperhtml';
import {create_program} from './webgl';
import {add_reload_hook} from './reloader';
import {assert, qs, each_line} from './utils';

export function parse_sections(text) {
    const sections = [];
    let curr = null;
    text.split(/\n/).forEach((line, idx) => {
        const line_number = idx + 1;
        const m = line.match(/@shader\((\w+)\)/);
        if (m) {
            curr = {
                stage: m[1],
                start: line_number + 1,
                count: 0,
                text: '',
                lines: [],
            };
            sections.push(curr);
        } else if (curr) {
            curr.lines.push(line);
        }
    });
    sections.forEach(s => {
        s.count = s.lines.length;
        s.text = s.lines.join('\n');
    });
    return sections;
}

export const use_program = (function() {
    // program cache
    const cache = new Map;

    // url watcher
    const url_watches = [];
    function on_url_changed(url, callback) {
        url_watches.push({url, callback});
    }

    add_reload_hook(({path}) => {
        url_watches.forEach(({url, callback}) => {
            if (path == url || path == '/'+url)
                callback(url);
        });
    });

    async function load_program(program, url) {
        // mark program as not ready
        program.ready = false;

        const text = await fetch(url).then(r => r.text());
        const sections = parse_sections(text);

        webgl_debug_clear();

        const shaders = [];
        sections.forEach(section => {
            const shader_type = gl[section.stage.toUpperCase() + '_SHADER'];
            assert(shader_type);

            const shader = gl.createShader(shader_type);

            const source = [
                '#version 300 es',
                'precision highp float;',
                `#line ${section.start}`,
                section.text
            ].join('\n');

            gl.shaderSource(shader, source);
            gl.compileShader(shader);

            if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                shaders.push(shader);
                return;
            }

            const log = gl.getShaderInfoLog(shader);
            webgl_debug(url, text, log);
        });

        if (shaders.length !== 2) {
            console.log('failed to compile all stages for:', url);
            return;
        }

        {
            // create and link the webgl program object
            const pgm = gl.createProgram();
            shaders.forEach(s => gl.attachShader(pgm, s));
            gl.linkProgram(pgm);

            if (!gl.getProgramParameter(pgm, gl.LINK_STATUS)) {
                const log = gl.getProgramInfoLog(pgm);
                console.log('program link error:', url);
                console.log(log);
                webgl_debug(url, text, log);
                return;
            }

            // success: initialize the wrapper program
            program._init(pgm);
            program.ready = true;
            console.log('recompiled and relinked:', url);
        }
    }

    return function use_program(path) {
        {
            // check cache, but return null if not ready
            const program = cache[path];
            if (program)
                return program.ready ?
                    program.use() :
                    null;
        }

        const program = cache[path] = create_program({
            name: path,
        });
        const url = `shaders/${path}.glsl`;
        const reload = () => load_program(program, url);
        on_url_changed(url, reload);
        reload();
        return null;
    }
}());

function webgl_debug_clear() {
    qs('.webgl-error').style.display = 'none';
}

function webgl_debug(url, text, log) {
    const el = qs('.webgl-error');

    const errors = {};
    const num_context_lines = 5;
    const line_numbers_to_show = new Set;
    const lines = text.split(/\n/);

    const html = [];

    //console.log(`%cShader compile errors in "${url}":`, 'font-weight: bold; text-decoration: underline;');

    each_line(log, (line, idx) => {
        const m = line.match(/^(ERROR|WARNING): \d+:(\d+):(.*)$/);
        if (!m) {
            const t = line.trim();
            if (!t.length || t == '\0')
                return;

            html.push(
                H`<div class=webgl-error-info>${t}</div>`,
            );
            return;
        }

        const error_level = m[1].toLowerCase();
        const error_line_number = +m[2];
        const error_description = m[3];
        //console.log('*', error_level, error_line_number, error_description);

        if (!errors[error_line_number])
            errors[error_line_number] = [];
        errors[error_line_number].push({
            level: error_level,
            error: error_description,
        });

        const line_range = [
            Math.max(1, error_line_number - num_context_lines),
            Math.min(1 + lines.length, error_line_number + num_context_lines),
        ];

        for (let line_number = line_range[0]; line_number <= line_range[1]; ++line_number)
            line_numbers_to_show.add(line_number);
    });

    {
        const numbers = Array.from(line_numbers_to_show);
        numbers.sort((a, b) => a - b);

        if (line_numbers_to_show.size) {
            html.push(
                H`<div class=webgl-error-log>compileShader errors in "${url}":`,
            );
        }

        let last_number;
        for (let number of numbers) {
            // console.log(
            //     `%c${(''+number).padStart(4)}: ${lines[number - 1]}`,
            //     errors[number] ?  'color: red;' : '');

            if (last_number && number !== last_number + 1) {
                html.push(H`<hr>`);
            }

            const span_class = errors[number] ? 'webgl-error-highlight' : '';
            html.push(
                H`<div class=${span_class}>${(''+number).padStart(4)}: ${lines[number - 1]}</div>`);

            if (errors[number]) {
                errors[number].forEach(e => {
                    // console.log(`%c[${e.level}] ${e.error}`,
                    //     'background-color: #888; color: white; font-style: italic; padding: 2px 8px');
                    const c = `webgl-error-log webgl-error-log-${e.level}`;
                    html.push(
                        H`<div class=${c}>${e.error}</div>`);
                });
            }

            last_number = number;
        }

        H(el)`${html}`;
        el.style.display = 'block';
    }
}

export function load_texture(options) {
    options = {
        flip: true,
        format: gl.RGBA8,
        filter: [gl.LINEAR_MIPMAP_LINEAR, gl.LINEAR],
        ...options,
        storage: false,
    };

    const texture = create_texture(options);

    if (is_mipmap())
        gl.generateMipmap(gl.TEXTURE_2D);

    load_image();
    return texture;

    function load_image() {
        const image = new Image;
        image.src = options.url;
        image.onload = function() {
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, options.flip ? 1 : 0);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, options.format, gl.RGBA, gl.UNSIGNED_BYTE, image);

            if (is_mipmap())
                gl.generateMipmap(gl.TEXTURE_2D);

            if (options.callback)
                options.callback();
        };
    }

    function is_mipmap() {
        if (!Array.isArray(options.filter))
            return false;

        const min_filter = options.filter[0];
        return (
            min_filter === gl.NEAREST_MIPMAP_NEAREST ||
            min_filter === gl.LINEAR_MIPMAP_NEAREST ||
            min_filter === gl.LINEAR_MIPMAP_LINEAR);
    }
}

export function create_texture(options) {
    options = {
        target: gl.TEXTURE_2D,
        format: gl.RGBA8,
        size: 4,
        levels: 0,
        max_anisotropy: 1,
        filter: gl.NEAREST,
        wrap: gl.CLAMP_TO_EDGE,
        storage: true,
        ...options
    };

    const texture = gl.createTexture();
    const {target} = options;

    gl.bindTexture(target, texture);

    tex_parameter_option('filter', gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER);
    tex_parameter_option('wrap', gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T);

    if (options.max_anisotropy > 1) {
        gl.texParameterf(target,
            gl.exts.EXT_texture_filter_anisotropic.TEXTURE_MAX_ANISOTROPY_EXT,
            options.max_anisotropy);
    }

    if (target === gl.TEXTURE_2D) {
        const {format} = options;
        const size = [0, 1].map(idx => get_option('size', idx));

        if (options.storage) {
            const levels = options.levels || ~~Math.log2(Math.max(...size));
            gl.texStorage2D(target, levels, format, size[0], size[1]);
        } else {
            // XXX not sure about the last three parameters in this form
            gl.texImage2D(target, 0, format, size[0], size[1], 0,
                gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
    } else {
        assert(false, 'unhandled texture target');
    }

    return texture;

    function tex_parameter_option(option_name, ...pnames) {
        pnames.forEach((pname, idx) =>
            gl.texParameteri(target, pname, get_option(option_name, idx)));
    }

    function get_option(name, idx=0) {
        const o = options[name];
        return Array.isArray(o) ? o[idx] : o;
    }
}
