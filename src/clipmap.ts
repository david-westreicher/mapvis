import * as THREE from 'three';
import * as Collections from 'typescript-collections';

class Point {
    constructor(public x: number, public y: number) {
        this.x = Math.round(x);
        this.y = Math.round(y);
    }
    toString(): string {
        return Collections.util.makeString(this);
    }
    toArray(): number[] {
        return [this.x, this.y, 0];
    }
    normalize(normVal: number): number[] {
        return [this.x / normVal, this.y / normVal];
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
               Width: 9

               1       2       3       4       5       6       7       8       9
               +-------+-------+-------+-------+-------+-------+-------+-------+
               |       |       |       |       |       |       |       |       |
               |       |       |       |       |       |       |       |       |
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
    const cellWidth = 2 ** level;
    const start = -Math.floor(width / 2);

    // generate vertices
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
            const vertX = Math.round((x + start) * cellWidth);
            const vertY = Math.round((y + start) * cellWidth);
            const point = new Point(vertX, vertY);
            if (verts.containsKey(point)) continue;
            verts.setValue(point, verts.size());
        }
    }

    // generate grid recursively
    buildGridHelper(level - 1, width, verts, triangles);

    function getVertexIndex(x: number, y: number) {
        const vertX = Math.round((x + start) * cellWidth);
        const vertY = Math.round((y + start) * cellWidth);
        const point = new Point(vertX, vertY);
        return verts.getValue(point);
    }

    // generate triangles
    for (let x = 0; x < width - 1; x++) {
        for (let y = 0; y < width - 1; y++) {
            const distanceToCenter = Math.max(
                Math.abs(x + start + 0.5),
                Math.abs(y + start + 0.5)
            );
            if (level > 0 && distanceToCenter < (width - 1) / 4) continue;
            /*
             A ----- B
             | S   / |
             |   /   |
             | /  T  |
             C ----- D
            */
            const vertA = getVertexIndex(x, y);
            const vertB = getVertexIndex(x + 1, y);
            const vertC = getVertexIndex(x, y + 1);
            const vertD = getVertexIndex(x + 1, y + 1);
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

export function buildGrid(level: number, width: number): THREE.BufferGeometry {
    const points = new Collections.Dictionary<Point, number>();
    const triangles: number[][] = [];
    buildGridHelper(level, width, points, triangles);

    const totalWidth = Math.floor(width / 2) * 2 ** level * 2;
    const vertices = points.keys().map((point) => point.toArray());
    const vertUvs = points
        .keys()
        .map((point) => point.normalize(totalWidth).map((x) => x + 0.5));
    console.log(
        `Created clipmap with ${vertices.length} vertices and ${triangles.length} triangles, width ${totalWidth}m`
    );

    const geom = new THREE.BufferGeometry();
    geom.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(vertices.flat()), 3)
    );
    geom.setAttribute(
        'uv',
        new THREE.BufferAttribute(new Float32Array(vertUvs.flat()), 2)
    );
    geom.setIndex(triangles.flat());
    return geom;
}
