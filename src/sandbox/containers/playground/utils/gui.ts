import { isString } from "@lib/common";
import { cloneValue, colorToUint, encodePlaygroundControlsToString, uintToColor } from "@lib/fx/bundles/utils";
import { IMap } from "@lib/idl/IMap";
import { Color, IPlaygroundControlsState } from "@sandbox/store/IStoreState";
import { GUI } from "dat.gui";
import { GetAssetsModels, GetAssetsTextures } from "./deps";
import { toast } from 'react-semantic-toasts';
import copy from 'copy-to-clipboard';

export class GuiView {
    protected gui: GUI = null;
    protected mountEl: HTMLDivElement;
    protected hash: string;
    protected presetName: string = null;
    protected meshDebugDraw: IMap<boolean> = {};

    mount(el: HTMLDivElement) {
        this.mountEl = el;
    }

    detach() {
        this.mountEl.removeChild(this.gui.domElement);
    }

    attach() {
        this.mountEl.appendChild(this.gui.domElement);
    }

    debugDraw() {
        return this.meshDebugDraw;
    }

    preset(): string {
        return this.presetName;
    }
    
    static hash(controls: IPlaygroundControlsState): string {
        return JSON.stringify(controls.controls) +
            JSON.stringify(controls.presets) +
            // IP: hack to handle update of textures
            JSON.stringify(Object.values(controls.values).filter(isString));
    }


    remove() {
        if (this.gui) {
            this.detach();
            this.gui.destroy();
            this.gui = null;
            this.hash = null;
        }
    }


    create(controls: IPlaygroundControlsState) {
        if (!controls) {
            return;
        }

        const hash = GuiView.hash(controls);
        if (this.hash != hash) {
            this.remove();
        }

        if (Object.keys(controls.values).length == 0) {
            // empty controls are valid ?
            return null;
        }

        if (this.gui) {
            // nothing todo, same controls have been requested
            return;
        }

        // remove active preset if it doesn't exist anymore
        if (this.presetName && !controls.presets.find(p => p.name === this.presetName)) {
            this.presetName = null;
        }

        const gui = new GUI({ autoPlace: false });

        for (let name in controls.values) {
            let ctrl = controls.controls[name];
            let viewType = ctrl.properties["__type"] as string || ctrl.type;
            let caption = ctrl.properties["__caption"] as string || ctrl.name;
            let guiCtrl = null;
            switch (viewType) {
                case 'int':
                case 'uint':
                case 'float':
                    guiCtrl = gui.add(controls.values, name);
                    break;
                case 'slider':
                    let min = ctrl.properties["__min"] as number;
                    let max = ctrl.properties["__max"] as number;
                    let step = ctrl.properties["__step"] as number;
                    guiCtrl = gui.add(controls.values, name, min, max, step);
                    break;
                case 'color':
                    let colorFolder = gui.addFolder(caption);
                    let clr = controls.values[name] as Color;
                    colorFolder.addColor({ color: colorToUint(clr) }, 'color').onChange(value => uintToColor(value, clr));
                    colorFolder.add({ opacity: clr.a }, 'opacity', 0, 1).onChange(value => clr.a = value);
                    colorFolder.open();
                    break;
                case 'float2':
                    let vec2Folder = gui.addFolder(caption);
                    vec2Folder.add(controls.values[name], 'x');
                    vec2Folder.add(controls.values[name], 'y');
                    vec2Folder.close();
                    break;
                case 'float3':
                    let vec3Folder = gui.addFolder(caption);
                    vec3Folder.add(controls.values[name], 'x');
                    vec3Folder.add(controls.values[name], 'y');
                    vec3Folder.add(controls.values[name], 'z');
                    vec3Folder.close();
                    break;
                case 'float4':
                    let vec4Folder = gui.addFolder(caption);
                    vec4Folder.add(controls.values[name], 'x');
                    vec4Folder.add(controls.values[name], 'y');
                    vec4Folder.add(controls.values[name], 'z');
                    vec4Folder.add(controls.values[name], 'w');
                    vec4Folder.close();
                    break;
                case 'texture2d':
                    {
                        const list = GetAssetsTextures();
                        let def = controls.values[name] as string;
                        if (!list.includes(def)) {
                            def = list[0];
                        }
                        // override initial value if it does not suit available resources
                        gui.add(controls.values, name, list).setValue(def);
                    }
                    break;
                case 'mesh':
                    {
                        let def = controls.values[name] as string;
                        const list = GetAssetsModels();
                        if (!list.includes(def)) {
                            def = list[0];
                        }
                        // override initial value if it does not suit available resources
                        const folder = gui.addFolder(caption);
                        folder.add(controls.values, name, list).setValue(def);
                        
                        {
                            this.meshDebugDraw[name] ||= false;
                            folder.add(this.meshDebugDraw, name).name('show (debug)');
                        }
                        
                        folder.open();
                    }
                    break;
            }

            if (guiCtrl) {
                guiCtrl.name(caption);
            }
        }

        if (controls.presets?.length) {
            gui.add(this, 'presetName', ['', ...controls.presets.map(p => p.name)]).onChange(name => {
                console.log('apply preset', name);
                const preset = controls.presets.find(p => p.name == name);
                if (preset) {
                    preset.data.forEach(entry => {
                        let control = controls.controls[entry.name];
                        if (control) {
                            controls.values[entry.name] = cloneValue(entry.type, entry.value);
                        }
                    });
                    setTimeout(() => {
                        this.remove();
                        this.create(controls);
                    }, 10);
                }
            }).name('preset');
        }

        const copyToClipboard = '<center>copy to clipboard</center>';
        // todo: show notification
        gui.add({
            [copyToClipboard]: () => {
                copy(encodePlaygroundControlsToString(controls), { debug: true });
                toast({
                    size: 'tiny',
                    type: 'info',
                    title: `Copied to clipboard`,
                    animation: 'bounce',
                    time: 2000
                });
            }
        }, copyToClipboard);

        // gui.close();
        gui.open();

        gui.domElement.style.position = 'absolute';
        gui.domElement.style.top = '2px';
        
        this.gui = gui;
        this.hash = hash;

        this.attach();
    }
}