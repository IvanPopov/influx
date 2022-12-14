import { assert } from "@lib/common";
import { IMap } from "@lib/idl/IMap";
import * as THREE from 'three';

const UNUSED32 = -1 >>> 0;


class vertexHashEntry {
    v: THREE.Vector3;
    index: number;
    next: vertexHashEntry;
};


export function GeneratePointReps(
    indices: number[], nFaces: number,
    positions: ArrayLike<number>, nVerts: number) {
    const pointRep: number[] = new Array(nVerts);
    const vertexToCorner = new Array<number>(nVerts);
    const vertexCornerList = (new Array<number>(nFaces * 3));

    vertexToCorner.fill(UNUSED32);
    vertexCornerList.fill(UNUSED32);

    // build initial lists and validate indices
    for (let j = 0; j < (nFaces * 3); ++j) {
        let k = indices[j];
        if (k === -1)
            continue;

        if (k >= nVerts) {
            assert(false);
            return null;
        }

        vertexCornerList[j] = vertexToCorner[k];
        vertexToCorner[k] = j;
    }


    const hashTable: IMap<vertexHashEntry> = {};
    const pos = vert => new THREE.Vector3(positions[vert * 3 + 0], positions[vert * 3 + 1], positions[vert * 3 + 2]);

    for (let vert = 0; vert < nVerts; ++vert) {
        let px = pos(vert).x;
        let py = pos(vert).y;
        let pz = pos(vert).z;

        const hashKey = `${px.toFixed(3)}:${py.toFixed(3)}:${pz.toFixed(3)}`;


        let found = UNUSED32;

        for (let current = hashTable[hashKey]; current != null; current = current.next) {
            if (current.v.x == pos(vert).x
                && current.v.y == pos(vert).y
                && current.v.z == pos(vert).z) {
                let head = vertexToCorner[vert];

                let ispresent = false;

                while (head != UNUSED32) {
                    const face = head / 3;
                    if ((indices[face * 3] == current.index) || (indices[face * 3 + 1] == current.index) || (indices[face * 3 + 2] == current.index)) {
                        ispresent = true;
                        break;
                    }

                    head = vertexCornerList[head];
                }

                if (!ispresent) {
                    found = current.index;
                    break;
                }
            }
        }

        if (found != UNUSED32) {
            pointRep[vert] = found;
        }
        else {
            let newEntry = new vertexHashEntry;

            newEntry.v = pos(vert);
            newEntry.index = vert;
            newEntry.next = hashTable[hashKey];
            hashTable[hashKey] = newEntry;

            pointRep[vert] = vert;
        }
    }

    return pointRep;
}


class edgeHashEntry {
    v1: number;
    v2: number;
    vOther: number;
    face: number;
    next: edgeHashEntry;
};

//---------------------------------------------------------------------------------
// Convert PointRep to Adjacency
//---------------------------------------------------------------------------------

export function ConvertPointRepsToAdjacencyImpl(
    indices: ArrayLike<number>, nFaces: number,
    positions: ArrayLike<number>, nVerts: number,
    pointRep: ArrayLike<number>) {
    const adjacency: number[] = new Array(nFaces * 3);
    const hashTable: IMap<edgeHashEntry> = {};

    const pos = vert => new THREE.Vector3(positions[vert * 3 + 0], positions[vert * 3 + 1], positions[vert * 3 + 2]);

    // add face edges to hash table and validate indices
    for (let face = 0; face < nFaces; ++face) {
        let i0 = indices[face * 3];
        let i1 = indices[face * 3 + 1];
        let i2 = indices[face * 3 + 2];

        if (i0 == -1
            || i1 == -1
            || i2 == -1)
            continue;

        if (i0 >= nVerts
            || i1 >= nVerts
            || i2 >= nVerts)
            return null;

        const v1 = pointRep[i0];
        const v2 = pointRep[i1];
        const v3 = pointRep[i2];

        // filter out degenerate triangles
        if (v1 == v2 || v1 == v3 || v2 == v3)
            continue;

        for (let point = 0; point < 3; ++point) {
            const va = pointRep[indices[face * 3 + point]];
            const vb = pointRep[indices[face * 3 + ((point + 1) % 3)]];
            const vOther = pointRep[indices[face * 3 + ((point + 2) % 3)]];

            const hashKey = `${va}`;

            let newEntry = new edgeHashEntry;
            newEntry.v1 = va;
            newEntry.v2 = vb;
            newEntry.vOther = vOther;
            newEntry.face = face;
            newEntry.next = hashTable[hashKey];
            hashTable[hashKey] = newEntry;
        }
    }

    adjacency.fill(UNUSED32)

    for (let face = 0; face < nFaces; ++face) {
        let i0 = indices[face * 3];
        let i1 = indices[face * 3 + 1];
        let i2 = indices[face * 3 + 2];

        // filter out unused triangles
        if (i0 == -1
            || i1 == -1
            || i2 == -1)
            continue;

        const v1 = pointRep[i0];
        const v2 = pointRep[i1];
        const v3 = pointRep[i2];

        // filter out degenerate triangles
        if (v1 == v2 || v1 == v3 || v2 == v3)
            continue;

        for (let point = 0; point < 3; ++point) {
            if (adjacency[face * 3 + point] != UNUSED32)
                continue;

            // see if edge already entered, if not then enter it
            const va = pointRep[indices[face * 3 + ((point + 1) % 3)]];
            const vb = pointRep[indices[face * 3 + point]];
            const vOther = pointRep[indices[face * 3 + ((point + 2) % 3)]];

            const hashKey = `${va}`;

            let current = hashTable[hashKey];
            let prev = null;

            let foundFace = UNUSED32;

            while (current != null) {
                if ((current.v2 == vb) && (current.v1 == va)) {
                    foundFace = current.face;
                    break;
                }

                prev = current;
                current = current.next;
            }

            let found = current;
            let foundPrev = prev;

            let bestDiff = -2.0;

            // Scan for additional matches
            if (current) {
                prev = current;
                current = current.next;

                // find 'better' match
                while (current != null) {
                    if ((current.v2 == vb) && (current.v1 == va)) {
                        const pB1 = pos(vb);
                        const pB2 = pos(va);
                        const pB3 = pos(vOther);

                        let v12 = (new THREE.Vector3).subVectors(pB1, pB2);
                        let v13 = (new THREE.Vector3).subVectors(pB1, pB3);

                        const bnormal = v12.cross(v13).normalize();

                        if (bestDiff == -2.0) {
                            const pA1 = pos(found.v1);
                            const pA2 = pos(found.v2);
                            const pA3 = pos(found.vOther);

                            v12 = (new THREE.Vector3).subVectors(pA1, pA2);
                            v13 = (new THREE.Vector3).subVectors(pA1, pA3);

                            const anormal = (new THREE.Vector3).crossVectors(v12, v13).normalize();

                            bestDiff = anormal.dot(bnormal);
                        }

                        const pA1 = pos(current.v1);
                        const pA2 = pos(current.v2);
                        const pA3 = pos(current.vOther);

                        v12 = (new THREE.Vector3).subVectors(pA1, pA2);
                        v13 = (new THREE.Vector3).subVectors(pA1, pA3);

                        const anormal = (new THREE.Vector3).crossVectors(v12, v13).normalize();

                        const diff = anormal.dot(bnormal);

                        // if face normals are closer, use new match
                        if (diff > bestDiff) {
                            found = current;
                            foundPrev = prev;
                            foundFace = current.face;
                            bestDiff = diff;
                        }
                    }

                    prev = current;
                    current = current.next;
                }
            }

            if (foundFace != UNUSED32) {
                assert(found != null);

                // remove found face from hash table
                if (foundPrev != null) {
                    foundPrev.next = found.next;
                }
                else {
                    hashTable[hashKey] = found.next;
                }

                assert(adjacency[face * 3 + point] == UNUSED32);
                adjacency[face * 3 + point] = foundFace;

                // Check for other edge
                const hashKey2 = `${vb}`;

                current = hashTable[hashKey2];
                prev = null;

                while (current != null) {
                    if ((current.face == face) && (current.v2 == va) && (current.v1 == vb)) {
                        // trim edge from hash table
                        if (prev != null) {
                            prev.next = current.next;
                        }
                        else {
                            hashTable[hashKey2] = current.next;
                        }
                        break;
                    }

                    prev = current;
                    current = current.next;
                }

                // mark neighbor to point back
                let linked = false;

                for (let point2 = 0; point2 < point; ++point2) {
                    if (foundFace == adjacency[face * 3 + point2]) {
                        linked = true;
                        adjacency[face * 3 + point] = UNUSED32;
                        break;
                    }
                }

                if (!linked) {
                    let point2 = 0;
                    for (; point2 < 3; ++point2) {
                        let k = indices[foundFace * 3 + point2];
                        if (k == -1)
                            continue;

                        if (pointRep[k] == va)
                            break;
                    }

                    if (point2 < 3) {
                        // update neighbor to point back to this face match edge
                        adjacency[foundFace * 3 + point2] = face;
                    }
                }
            }
        }
    }

    return adjacency;
}



function GenerateGSAdjacencyImpl(
    indices: ArrayLike<number>, nFaces: number,
    pointRep: ArrayLike<number>,
    adjacency: ArrayLike<number>, nVerts: number) {
    const indicesAdj: number[] = new Array(nFaces * 6);

    let inputi = 0;
    let outputi = 0;

    for (let face = 0; face < nFaces; ++face) {
        for (let point = 0; point < 3; ++point) {
            indicesAdj[outputi] = indices[inputi];
            ++outputi;
            ++inputi;

            assert(outputi < (nFaces * 6));

            const a = adjacency[face * 3 + point];
            if (a == UNUSED32) {
                indicesAdj[outputi] = indices[face * 3 + ((point + 2) % 3)];
            }
            else {
                let v1 = indices[face * 3 + point];
                let v2 = indices[face * 3 + ((point + 1) % 3)];

                if (v1 == -1 || v2 == -1) {
                    indicesAdj[outputi] = -1;
                }
                else {
                    if (v1 >= nVerts || v2 >= nVerts) {
                        assert(false);
                        return null;
                    }

                    v1 = pointRep[v1];
                    v2 = pointRep[v2];

                    let vOther = UNUSED32;

                    // find other vertex
                    for (let k = 0; k < 3; ++k) {
                        const ak = indices[a * 3 + k];
                        if (ak == -1)
                            break;

                        if (ak >= nVerts) {
                            assert(false);
                            return null;
                        }

                        if (pointRep[ak] == v1)
                            continue;

                        if (pointRep[ak] == v2)
                            continue;

                        vOther = ak;
                    }

                    if (vOther == UNUSED32) {
                        indicesAdj[outputi] = indices[face * 3 + ((point + 2) % 3)];

                    }
                    else {
                        indicesAdj[outputi] = vOther;
                    }
                }
            }
            ++outputi;
        }
    }

    return indicesAdj;
}

export function prepareTrimesh(g: THREE.BufferGeometry) {
    // g.setIndex(Array(g.attributes.position.count).fill(0).map((x, i) => i < g.attributes.position.count / 2 ? i : 0));

    assert(g.attributes.position);
    assert(g.attributes.normal);
    assert(g.attributes.uv);
    assert(!g.index);

    const positions = g.attributes.position.array;
    const normals = g.attributes.normal.array;
    const uvs = g.attributes.uv.array;
    const vertCount = g.attributes.position.count;
    const faceCount = vertCount / 3;
    const indices: number[] = Array(vertCount).fill(0).map((x, i) => i);

    const pointReps = GeneratePointReps(indices, faceCount, positions, vertCount);
    const adjacency = ConvertPointRepsToAdjacencyImpl(indices, faceCount, positions, vertCount, pointReps);
    const indicesAdj = GenerateGSAdjacencyImpl(indices, faceCount, pointReps, adjacency, vertCount);
    // console.log(pointReps, adjacency);

    // pos, norm, uv
    const vertices = new Array<number>(vertCount * (3 + 3 + 2));
    for (let i = 0; i < vertCount; ++i) {
        for (let j = 0; j < 3; ++j) {
            vertices[8 * i + 0 + j] = positions[3 * i + j];
        }

        for (let j = 0; j < 3; ++j) {
            vertices[8 * i + 3 + j] = normals[3 * i + j];
        }

        for (let j = 0; j < 2; ++j) {
            vertices[8 * i + 6 + j] = uvs[2 * i + j];
        }
    }

    const faces = indices;
    return {
        vertCount,
        faceCount,
        vertices,
        faces,
        indicesAdj
    };

    // let ind = [];
    // [3].forEach(iFace => {
    //     let i0 = adjacency[iFace * 3 + 0];
    //     let i1 = adjacency[iFace * 3 + 1];
    //     let i2 = adjacency[iFace * 3 + 2];

    //     //ind.push(indices[iFace * 3 + 0], indices[iFace * 3 + 1], indices[iFace * 3 + 2]);

    //     [i0, i1, i2].filter(i => i != UNUSED32).forEach(iFace => {
    //         ind.push(indices[iFace * 3 + 0], indices[iFace * 3 + 1], indices[iFace * 3 + 2]);
    //     });
    // });

    // g.setIndex(ind);
}
