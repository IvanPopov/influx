class DistinctColor {
    static list = [
        0xe6194b, 0x3cb44b, 0xffe119, 0x4363d8, 0xf58231, 0x911eb4, 
        0x46f0f0, 0xf032e6, 0xbcf60c, 0xfabebe, 0x008080, 0xe6beff, 
        0x9a6324, 0xfffac8, 0x800000, 0xaaffc3, 0x808000, 0xffd8b1, 
        0x000075, 0x808080  //, 0xffffff, 0x000000
    ];

    private _curIdx: number;

    constructor(idx = 0) {
        this._curIdx = idx;
    }


    value(): number {
        return this._curIdx;
    }


    pickNext(): number {
        this._curIdx = (this._curIdx + 1) % DistinctColor.list.length;
        return this.value();
    }


    toRGBAString() {
        return DistinctColor.toRGBAString(DistinctColor.resolveColor(this.value()));
    }


    static resolveColor(idx: number) {
        return DistinctColor.list[idx % DistinctColor.list.length];
    }


    static toRGBAString(val: number) {
        let r = ((val >> 16) & 0xff);
        let g = ((val >> 8) & 0xff);
        let b = ((val >> 0) & 0xff);
        return `rgb(${r}, ${g}, ${b})`;
    }
    

    static make(idx: number) {
        return new DistinctColor(idx);
    }

    static buildVariousClasses(prefix = 'dc') {
        return DistinctColor.list.reduce((styles, color) => (
            styles[`${prefix}_${color}`] = { 
                opacity: 0.3, 
                backgroundColor: `${DistinctColor.toRGBAString(color)}` 
            }, styles), {});

        // [`dc_${0xe6194b}`]: { opacity: 0.3, backgroundColor: '#e6194b' },
        // [`dc_${0x3cb44b}`]: { opacity: 0.3, backgroundColor: '#3cb44b' },
        // ...
        // ...
        // [`dc_${0x000075}`]: { opacity: 0.3, backgroundColor: '#000075' },
        // [`dc_${0x808080}`]: { opacity: 0.3, backgroundColor: '#808080' }
    }
}

export default DistinctColor;

