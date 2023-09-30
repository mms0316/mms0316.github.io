import { xyzToKey, keyToXyz } from './schematics.js';

export class MapArtSchematic {
    constructor(schematic, region) {
        this.schematic = schematic;
        this.region = region;

        //set by load()
        this.blocks = new Map();
        this.minX = 0;
        this.maxX = schematic.xsize - 1;
        this.minY = 0;
        this.maxY = schematic.ysize - 1;
        this.minZ = 0;
        this.maxZ = schematic.zsize - 1;
    }
    
    static getBlockKey(x, z) {
        return '' + x + ',' + z;
    }
    
    static fromBlockKey(blockKey) {
        const [x, z] = blockKey.split(',');
        //string to integer
        return [+x, +z];
    }
    
    load() {
        // Make a different representation, to handle negative values throughout the functions
        // This also considers only the highest block of a (x, z) coordinate.
        
        let container;
        if (this.region) {
            container = this.schematic.blocks.get(this.region);
        } else {
            container = this.schematic.blocks;
        }
        
        for (const [schematicKey, block] of container.entries()) {
            const [x, y, z] = keyToXyz(schematicKey, this.schematic.xsize, this.schematic.ysize, this.schematic.zsize);

            const blockKey = MapArtSchematic.getBlockKey(x, z);

            const currentY = this.blocks.get(blockKey);

            if (!currentY || y > currentY) {
                this.blocks.set(blockKey, {y : y, block : block});
            }
        }
    }

    isValidSize() {
        return this.schematic.xsize % 128 == 0 && this.schematic.zsize % 128 == 1 && this.schematic.ysize < 320;
    }
    
    // Needs previous call to load()
    getHighestBlockInfo(x, z) {
        const blockKey = MapArtSchematic.getBlockKey(x, z);

        return this.blocks.get(blockKey);
    }
    
    getHighestBlock(x, z) {
        const highestBlockInfo = this.getHighestBlockInfo(x, z);
        if (!highestBlockInfo) return this.minY;

        return highestBlockInfo.y;
    }

    getStripBounds(x) {
        let lowest = this.maxY;
        let highest = this.minY;

        for (let iterZ = this.minZ; iterZ <= this.maxZ; iterZ++) {
            const iterBlockInfo = this.getHighestBlockInfo(x, iterZ);
            if (!iterBlockInfo) continue;

            if (iterBlockInfo.y < lowest) {
                lowest = iterBlockInfo.y;
            }
            if (iterBlockInfo.y > highest) {
                highest = iterBlockInfo.y;
            }
        }
        return [lowest, highest];
    }

    // Find what is the support block / noob line block
    getSupportBlock() {
        const highestBlockInfo = this.getHighestBlockInfo(0, 0);
        if (!highestBlockInfo) return 'minecraft:air';

        return highestBlockInfo.block;
    }

    getBoundaries() {
        const boundaries = new Map();

        for (let iterX = this.minX; iterX <= this.maxX; iterX++) {
            boundaries.set(iterX, getStripBounds(iterX));
        }

        return boundaries;
    }

    // Move a map art strip (x-axis) to the desired y level on (x,z)
    moveStripVertically(x, yToMove, z, leeway) {
        const yInfo = this.getHighestBlockInfo(x, z);
        if (!yInfo) throw "Invalid x, z coordinate";

        let yToAdd = yToMove - yInfo.y;
        if (yToAdd == 0) return;
        if (yToAdd > 0 && yToAdd <= leeway) return;
        if (yToAdd < 0 && -yToAdd <= leeway) return;

        if (yToAdd > 0) {
            yToAdd -= leeway;
        } else {
            yToAdd += leeway;
        }

        // Move
        for (let iterZ = this.minZ; iterZ <= this.maxZ; iterZ++) {
            const iterBlockInfo = this.getHighestBlockInfo(x, iterZ);
            
            iterBlockInfo.y += yToAdd;
            
            if (iterBlockInfo.y > this.maxY) {
                this.maxY = iterBlockInfo.y;
            }
            else if (iterBlockInfo.y < this.minY) {
                this.minY = iterBlockInfo.y;
            }
        }
    }
    
    // Checks minY / maxY for out-bounds, moving the entire schematic
    // If a strip becomes over maxHeight, that strip is brought down
    normalize(maxHeight) {
        if (this.minY == 0 && this.maxY <= maxHeight) return; //nothing to do

        const yToAdd = -this.minY;
        
        for (const blockInfo of this.blocks.values()) {
            blockInfo.y += yToAdd;
        }
        
        this.minY = 0;
        this.maxY += yToAdd;

        debugger;

        if (this.maxY >= maxHeight) {
            //move back down
            for (let iterX = this.minX; iterX <= this.maxX; iterX++) {
                const [_, highest] = this.getStripBounds(iterX);
                if (highest < maxHeight) continue;
    
                const excess = highest - maxHeight + 1;
                for (let iterZ = this.minZ; iterZ <= this.maxZ; iterZ++) {
                    const iterBlockInfo = this.getHighestBlockInfo(iterX, iterZ);

                    iterBlockInfo.y -= excess;
                }
            }

            this.maxY = maxHeight - 1;
        }
    }
    
    // To be used after blocks are changed. This may generate a new schematic object.
    // In case a litematic schematic with multiple regions was used, only the chosen region is returned
    toSchematic() {
        // so far, no need to check for x and z changes
        if (this.maxY == this.schematic.ysize - 1) return this.schematic;

        //console.log(`Creating new schematic ${this.maxX + 1} x ${this.maxY + 1} x ${this.maxZ + 1}`);

        const schematic = {
            blocks: new Map(),
            xsize: this.maxX + 1,
            ysize: this.maxY + 1,
            zsize: this.maxZ + 1
        }
        
        if (this.region) {
            schematic.blocks.set(this.region, new Map());
            schematic.regions = this.schematic.regions;
        }

        let container;
        if (this.region) {
            container = schematic.blocks.get(this.region);
        } else {
            container = schematic.blocks;
        }
        
        for (const [blockKey, blockInfo] of this.blocks.entries()) {
            const [x, z] = MapArtSchematic.fromBlockKey(blockKey);
            const y = blockInfo.y;
            const block = blockInfo.block;
            
            const key = xyzToKey(x, y, z, schematic.xsize, schematic.ysize, schematic.zsize);
            container.set(key, block);
        }
        
        return schematic;
    }
}