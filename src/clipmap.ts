import * as THREE from 'three';
import * as Collections from 'typescript-collections';

class Point {
    constructor(public x: number, public y: number, public cellWidth: number) {
        this.x = Math.round(x);
        this.y = Math.round(y);
        this.cellWidth = cellWidth;
    }
    toString(): string {
        return this.x + '|' + this.y;
    }
    toArray(): number[] {
        return [this.x, this.y, this.cellWidth];
    }
}

function buildGridHelper(
    level: number,
    width: number,
    verts: Collections.Dictionary<Point, number>,
    triangles: number[][]
) {
    /*        
               Level: 3
               Width: 8

     vertices  0       1       2       3       4       5       6       7       8
               +-------+-------+-------+-------+-------+-------+-------+-------+
               |       |       |       |       |       |       |       |       |
      cells-x  |   1   |   2   |   3   |   4   |   5   |   6   |   7   |   8   |
               |       |       |       |       |       |       |       |       |
               +-------+-------+-------+-------+-------+-------+-------+-------+
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
               +-------+-------+---+---+---+---+---+---+---+---+-------+-------+
               |       |       |   |   |   |   |   |   |   |   |       |       |
               |       |       +---+---+---+---+---+---+---+---+       |       |
               |       |       |   |   |   |   |   |   |   |   |       |       |
               +-------+-------+---+---+-+-+-+-+-+-+-+-+---+---+-------+-------+
               |       |       |   |   +-+-+-+-+-+-+-+-+   |   |       |       |
               |       |       +---+---+-+-ooooooooo-+-+---+---+       |       |
               |       |       |   |   +-+-ooooooooo-+-+   |   |       |       |
               +-------+-------+---+---+-+-ooooooooo-+-+---+---+-------+-------+
               |       |       |   |   +-+-ooooooooo-+-+   |   |       |       |
               |       |       +---+---+-+-ooooooooo-+-+---+---+       |       |
               |       |       |   |   +-+-+-+-+-+-+-+-+   |   |       |       |
               +-------+-------+---+---+-+-+-+-+-+-+-+-+---+---+-------+-------+
               |       |       |   |   |   |   |   |   |   |   |       |       |
               |       |       +---+---+---+---+---+---+---+---+       |       |
               |       |       |   |   |   |   |   |   |   |   |       |       |
               +-------+-------+---+---+---+---+---+---+---+---+-------+-------+
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
               +-------+-------+-------+-------+-------+-------+-------+-------+
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
               +-------+-------+-------+-------+-------+-------+-------+-------+

     */
    if (level < 0) return;
    const cellWidth = 2 ** level * 20;
    const midOffset = -width / 2;

    // generate grid recursively
    buildGridHelper(level - 1, width, verts, triangles);

    // generate vertices
    for (let x = 0; x < width + 1; x++) {
        for (let y = 0; y < width + 1; y++) {
            const vertX = Math.round((x + midOffset) * cellWidth);
            const vertY = Math.round((y + midOffset) * cellWidth);
            const point = new Point(vertX, vertY, cellWidth);
            if (verts.containsKey(point)) continue;
            verts.setValue(point, verts.size());
        }
    }

    function getVertexIndex(x: number, y: number) {
        const vertX = Math.round((x + midOffset) * cellWidth);
        const vertY = Math.round((y + midOffset) * cellWidth);
        const point = new Point(vertX, vertY, 0);
        return verts.getValue(point);
    }

    // generate triangles
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
            const distanceToCenter = Math.max(
                Math.abs(x + midOffset + 0.5),
                Math.abs(y + midOffset + 0.5)
            );
            const recursiveSize = width / 4;
            if (level > 0 && distanceToCenter < recursiveSize) continue;

            const vertA = getVertexIndex(x, y);
            const vertB = getVertexIndex(x + 1, y);
            const vertC = getVertexIndex(x, y + 1);
            const vertD = getVertexIndex(x + 1, y + 1);

            // Fix cracks between recursive grids
            if (
                level > 0 &&
                recursiveSize < distanceToCenter &&
                distanceToCenter <= recursiveSize + 1
            ) {
                /*
                    A---E---B
                    |  /\   |
                    G /  \  F
                    |/    \ |
                    C---H---D
                */
                const vertE = getVertexIndex(x + 0.5, y);
                const vertF = getVertexIndex(x + 1, y + 0.5);
                const vertG = getVertexIndex(x, y + 0.5);
                const vertH = getVertexIndex(x + 0.5, y + 1);
                if (vertE) {
                    triangles.push([vertA, vertE, vertC]);
                    triangles.push([vertE, vertD, vertC]);
                    triangles.push([vertE, vertB, vertD]);
                    continue;
                } else if (vertF) {
                    triangles.push([vertA, vertB, vertF]);
                    triangles.push([vertA, vertF, vertC]);
                    triangles.push([vertC, vertF, vertD]);
                    continue;
                } else if (vertG) {
                    triangles.push([vertA, vertB, vertG]);
                    triangles.push([vertG, vertB, vertD]);
                    triangles.push([vertG, vertD, vertC]);
                    continue;
                } else if (vertH) {
                    triangles.push([vertA, vertH, vertC]);
                    triangles.push([vertA, vertB, vertH]);
                    triangles.push([vertB, vertD, vertH]);
                    continue;
                }
            }
            /*
                A ----- B       A ----- B
                | S   / |       | \  S  |
                |   /   |  or   |   \   |
                | /  T  |       | T   \ |
                C ----- D       C ----- D
            */
            if ((x % 2 == 0) === (y % 2 == 1)) {
                triangles.push([vertA, vertB, vertC]);
                triangles.push([vertB, vertD, vertC]);
            } else {
                triangles.push([vertA, vertD, vertC]);
                triangles.push([vertA, vertB, vertD]);
            }
        }
    }
}

export function buildGeometry(
    level: number,
    width: number
): THREE.BufferGeometry {
    if (width % 4 !== 0) throw new Error('Width has to be a multiple of 4');
    const points = new Collections.Dictionary<Point, number>();
    const triangles: number[][] = [];
    buildGridHelper(level, width, points, triangles);

    const totalWidth = width * 2 ** level;
    const vertices = points.keys().map((point) => point.toArray());
    console.log(
        `Created clipmap with ${vertices.length} vertices and ${triangles.length} triangles, width ${totalWidth}m`
    );

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(vertices.flat()), 3)
    );
    geom.setIndex(triangles.flat());
    return geom;
}
