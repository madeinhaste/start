const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const notify = require('rollup-plugin-notify');
const {terser} = require('rollup-plugin-terser');

const production = !process.env.ROLLUP_WATCH;
const re_ungap = /@ungap\/(essential-weakset|weakmap|custom-event|essential-map)/;

const config = src => ({
    input: src,
    output: {
        dir: './public/bundles',
        format: 'esm',
        sourcemap: true,
    },
    plugins: [
        resolve(),
        commonjs(),
        production && terser(),
        notify(),
    ],
    moduleContext: name => name.match(re_ungap) ? 'null' : 'undefined',
    external: [ 'std:kv-storage' ],
});

const bundle = name => config(`src/${name}.js`);

module.exports = [
    'app',
].map(bundle);
