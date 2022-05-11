bool UpdateRoutine(inout Part part)
{
    part.speed = $input0;
    part.pos = $input1;
    part.size = $input2;
    part.timelife = $input3;
    return $input4;
}
