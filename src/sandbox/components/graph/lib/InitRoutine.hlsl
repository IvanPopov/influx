/*
 * @node {InitRoutine}
 * @desc Determines initial state of each particle.
 * @title Init routine
 */
void InitRoutine(out Part part, int partId)
{
    part.speed = $input0;
    part.pos = $input1;
    part.size = $input2;
    part.timelife = $input3;
}
