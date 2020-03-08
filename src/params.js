import {assert, qs, clamp} from './utils';
// import {add_hotkeys} from './hotkeys';
import H from 'hyperhtml';

export function create_param_ui(params) {
    // FIXME this needs to be a deep copy/assign
    const params_default = {};
    Object.assign(params_default, params);

    // add_hotkeys(document, {
    //     KeyR() {
    //         reset_params(params, params_default);
    //     },
    // });
    //
    function ParamComponentRef(group, name, index) {
        this.group = group;
        this.name = name;
        this.index = index;
    }

    function ParamComponentInput(ref) {
        const id = `:${ref.name}_${ref.index}`;
        const html = H(ref.group, id);
        const prop = ref.group[ref.name];
        const value = (
            Array.isArray(prop) ||
            prop instanceof Float32Array) ? prop[ref.index] : prop;
        const value_type = (typeof value);
        const unit = '';

        if (value_type == 'number') {
            return html`
            <div data=${ref}
                 class=param-value
                 onmousedown=${on_param_value_event}
                 onmousemove=${on_param_value_event}
                 onmouseup=${on_param_value_event}>
                 ${value.toFixed(3)}${unit}
            </div>`;
        }
        else if (value_type == 'boolean') {
            return html`
            <input type=checkbox
                   data=${ref}
                   class=param-value
                   checked=${value}
                   onchange=${on_param_checkbox_change}>`;
        }
    }

    // this should be fine
    function Param(group, name) {
        const prop = group[name];
        const sliders = [];
        if (Array.isArray(prop) ||
            prop instanceof Float32Array)
        {
            for (let i = 0; i < prop.length; ++i) {
                const ref = new ParamComponentRef(group, name, i);
                sliders.push(ParamComponentInput(ref));
            }
        } else {
            const ref = new ParamComponentRef(group, name, 0);
            sliders.push(ParamComponentInput(ref));
        }

        return H(group, ':'+name)`
        <div class=param>
            <label class=param-label>${name}</label>
            <div class=param-sliders>${sliders}</div>
        </div>
        `;
    }

    function ParamChildren(ob) {
        const out = [];

        if (ob._closed)
            return out;

        for (let [k, v] of Object.entries(ob)) {
            if (k[0] == '_') {
                // ignore metadata props
                continue;
            }

            // slider
            if (typeof v == 'number' || 
                typeof v == 'boolean' ||
                Array.isArray(v) ||
                (v instanceof Float32Array)) {
                out.push(Param(ob, k));
                continue;
            }

            // group
            if (typeof v == 'object') {
                out.push(ParamGroup(v, k));
                continue;
            }
        }

        return out;
    }

    function ParamGroup(ob, name) {
        const closed = ob._closed;
        const icon_href = `icons/feather-sprite.svg#${
            closed ? 'plus-circle' : 'minus-circle'}`;

        return H(ob)`
        <div class=param-group>

            <label
                data=${ob}
                data-name=${name}
                class=param-group-label
                onclick=${on_param_group_click}>
                <svg class="feather param-group-icon">
                    <use xlink:href=${icon_href} />
                </svg>
                ${name}
            </label>

            <div class=param-group-content>${ParamChildren(ob)}</div>
        </div>
        `;
    }

    H(qs('.param-container'))`
        ${ParamGroup(params, 'root')}
    `;

    let dragging = null;

    document.addEventListener('pointerlockchange', e => {
        let el = document.pointerLockElement;
        dragging = el;
    });

    function on_param_group_click(e) {
        const el = e.target;
        const ob = el.data;
        const name = el.dataset.name;
        ob._closed = !ob._closed;
        ParamGroup(ob, name);
    }

    function on_param_value_event(e) {
        const el = e.target;

        switch (e.type) {
            case 'mousedown':
                el.requestPointerLock();
                e.preventDefault();
                break;

            case 'mouseup':
                document.exitPointerLock();
                e.preventDefault();
                break;

            case 'mousemove':
                if (dragging) {
                    let dx = e.movementX;
                    if (e.shiftKey)
                        dx *= .1;
                    else if (e.ctrlKey)
                        dx *= 10;

                    const ref = el.data;
                    adjust_param(ref, dx);

                    //const name = el.dataset.paramId;
                    //adjust_param(name, dx);
                    e.preventDefault();
                }
                break;
        }
    }

    function on_param_checkbox_change(e) {
        const el = e.target;
        const ref = el.data;
        const prop = ref.group[ref.name];
        const value = !!el.checked;
        if (Array.isArray(prop))
            prop[ref.index] = value;
        else
            ref.group[ref.name] = value;
        ParamComponentInput(ref);
        e.preventDefault();
    }

    function reset_params(ob) {
        Object.assign(params, ob);
        Params(params);
        for (let name in params)
            adjust_param(name, 0);
    }

    function adjust_param(ref, dx) {
        const delta = dx * 1e-3;

        const prop = ref.group[ref.name];
        if (prop instanceof Float32Array) {
            prop[ref.index] = clamp(prop[ref.index] + delta, 0, 1);
        } else {
            ref.group[ref.name] = clamp(ref.group[ref.name] + delta, 0, 1);
        }

        // update element
        ParamComponentInput(ref);
    }

    return {
        update() {
            ParamGroup(params, 'root');
        },
    };
}
