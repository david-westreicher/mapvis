import * as Collections from 'typescript-collections';

class Point {
    constructor(public x: number, public y: number) {
        this.x = Math.round(x);
        this.y = Math.round(y);
    }
    toString() {
        return Collections.util.makeString(this);
    }
}

function buildGridHelper(
    level: number,
    width: number,
    verts: Collections.Dictionary<Point, number>
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
    buildGridHelper(level - 1, width, verts);

    // generate index buffer
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < width; y++) {
            const vertX = Math.round((x + start) * cellWidth);
            const vertY = Math.round((y + start) * cellWidth);
            const point = new Point(vertX, vertY);
            if (verts.containsKey(point)) continue;
            verts.setValue(point, verts.size());
        }
    }
    return [];
}

export function buildGrid(level: number, width: number) {
    return buildGridHelper(
        level,
        width,
        new Collections.Dictionary<Point, number>()
    );
}
