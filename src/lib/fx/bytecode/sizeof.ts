const sizeof = {
    u32: () => 4,
    i32: () => 4,
    f32: () => 4,
    bool: () => sizeof.i32(),
    addr: () => sizeof.i32()
};


export default sizeof;