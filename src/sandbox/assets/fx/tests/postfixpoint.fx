struct T {
    float x;
    float y;
    float z;
};

int main(inout T t) {
    t.x = 10.0;
    t.y = 20.0;
    t.z = t.x * t.y;
    return (int)(t.z);
}