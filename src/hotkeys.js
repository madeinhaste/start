class KeyMap {
    constructor(el) {
        this.el = el;
        this.funcs = new Map;
        el.addEventListener('keydown', e => this.on_keydown(e));
    }

    add_hotkey(key, func) {
        if (this.funcs.get(key))
            console.warn('overriding hotkey:', key);
        this.funcs.set(key, func);
    }

    add_hotkeys(ob) {
        for (let [key, func] of Object.entries(ob))
            this.add_hotkey(key, func);
    }

    on_keydown(e) {
        let key = e.code;
        let func = this.funcs.get(key);
        if (func) {
            e.preventDefault();
            //console.log(`hotkey: [${key}] ${func}`);
            console.log(`hotkey: [${key}] ${func.name}`);
            func(e);
        }
    }
}

let keymaps = new Map;

function get_keymap(el) {
    let keymap = keymaps.get(el);
    if (keymap)
        return keymap;

    keymap = new KeyMap(el);
    keymaps.set(el, keymap);
    return keymap;
}

export function add_hotkeys(el, ob) {
    get_keymap(el).add_hotkeys(ob);
}
