import { generateEmbeddedPreview } from '/js/mapcolor.js';
import { MapArtSchematic } from '/js/mapartschematic.js';

self.onmessage = function(e) {
    const name = e.data.name;
    const mapartData = e.data.mapart;
    const order = e.data.order;
    const fixMushroomStems = e.data.fixMushroomStems;
    const generatePreview = e.data.generatePreview;
    const maxHeight = e.data.maxHeight;

    try {
        //JS Workers when passing data strip all functions of an object
        const mapart = Object.create(MapArtSchematic.prototype, Object.getOwnPropertyDescriptors(mapartData));

        //Zig-zag:
        // - y coordinate from (0, zsize-1) will define y of (1, zsize-1)
        // - y coordinate from (1, 0) will define y of (2, 0)
        // - y coordinate from (2, zsize-1) will define y of (3, zsize-1)
        // - y coordinate from (3, 0) will define y of (4, 0)
        // and so on
        const leeway = 1;

        let xStart = mapart.minX;

        let oob;

        do {
            //const bounds = mapart.getStripBounds(xStart);
            //console.log(`x ${xStart}: ${bounds.minY} ~ ${bounds.maxY}`)

            for (let x = xStart; x < mapart.maxX; x++) {
                let z = 0;

                if (x % 2 == 0) {
                    z = mapart.maxZ - 1;
                }
                
                let yOfNextX = mapart.strips[x].blocks[z].y;
            
                mapart.moveStripVertically(x + 1, yOfNextX, z, leeway);

                //const bounds = mapart.getStripBounds(x + 1);
                //console.log(`x ${x + 1}: ${bounds.minY} ~ ${bounds.maxY}`)
            }
        
            oob = mapart.normalizeContiguous(maxHeight, xStart);
            if (oob) {
                //Strip would go out of bounds

                mapart.normalizeStrip(oob);
                
                if (oob == mapart.maxX) break;

                xStart = oob;
            }
        } while (oob);

        if (fixMushroomStems) {
            mapart.fixMushroomStems();
        }

        const result = mapart.toSchematic();

        if (generatePreview) {
            generateEmbeddedPreview(result);
        }

        this.postMessage({
            name: name,
            zigzag: result,
            order: order
        });
    } catch (_) {
        this.postMessage({
            order: order
        });
    }
}
