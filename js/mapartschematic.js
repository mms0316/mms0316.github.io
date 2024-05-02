import { xyzToKey, keyToXyz } from './schematics.js';

export class MapArtSchematic {
    constructor(schematic, region) {
        this.schematic = schematic;
        this.region = region;

        if (region) {
            this.container = this.schematic.blocks.get(region);
        } else {
            this.container = this.schematic.blocks;
        }

        //set by load()
        this.blocks = undefined;
        this.minX = undefined;
        this.maxX = undefined;
        this.minY = undefined;
        this.maxY = undefined;
        this.minZ = undefined;
        this.maxZ = undefined;
        this.supportBlock = undefined;
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
        // This considers only the highest block of a (x, z) coordinate, but flags if there is a block below it.
        // (This assumes all supporting blocks are of the same type and that there are no more than 1 supporting block below)
        this.blocks = new Map();
        this.minX = 0;
        this.maxX = this.schematic.xsize - 1;
        this.minY = 0;
        this.maxY = this.schematic.ysize - 1;
        this.minZ = 0;
        this.maxZ = this.schematic.zsize - 1;

        // Iterate vertically (per strip)
        for (let x = this.minX; x <= this.maxX; x++) {
            for (let z = this.minZ; z <= this.maxZ; z++) {

                // Get highest block in (x, z), because the schematic may have been created with "Add blocks under" setting
                for (let y = this.schematic.ysize - 1; y >= 0; y--) {
                    const block = this.getFromSchematic(x, y, z);
                    if (block) {
                        let hasSupportingBlock = false;
                        const blockUnder = this.getFromSchematic(x, y - 1, z);
                        if (blockUnder) {
                            hasSupportingBlock = true;
                        }

                        const blockKey = MapArtSchematic.getBlockKey(x, z);
                        this.blocks.set(blockKey, {
                            y : y,
                            block : block,
                            hasSupportingBlock: hasSupportingBlock,
                            shade : this.getShade(x, y, z)
                        });

                        break;
                    }
                }
            }
        }

        // Get block in (0, 0), which is expected to be from the noob line
        this.supportBlock = this.getHighestBlockInfo(0, 0).block;
    }

    //Since the first line is a noob line, it's expected this function is called with z1 >= 1
    loadFromSection(x1, x2, z1, z2) {
        this.blocks = new Map();
        this.minX = x1;
        this.maxX = x2;
        this.minY = undefined;
        this.maxY = undefined;
        this.minZ = z1;
        this.maxZ = z2;

        // Iterate vertically (per strip)
        for (let x = x1; x <= x2; x++) {
            for (let z = z1; z <= z2; z++) {

                // Get highest block in (x, z), because the schematic may have been created with "Add blocks under" setting
                for (let y = this.schematic.ysize - 1; y >= 0; y--) {
                    const block = this.getFromSchematic(x, y, z);
                    if (block) {
                        let hasSupportingBlock = false;
                        const blockUnder = this.getFromSchematic(x, y - 1, z);
                        if (blockUnder) {
                            hasSupportingBlock = true;
                        }

                        const blockKey = MapArtSchematic.getBlockKey(x, z);
                        this.blocks.set(blockKey, {
                            y : y,
                            block : block,
                            hasSupportingBlock: hasSupportingBlock,
                            shade : this.getShade(x, y, z)
                        });

                        //Set min/max for y
                        const leastY = y - (hasSupportingBlock ? 1 : 0);
                        if (this.minY === undefined || (leastY < this.minY)) {
                            this.minY = leastY;
                        }
                        if (this.maxY === undefined || (y > this.maxY)) {
                            this.maxY = y;
                        }
                        break;
                    }
                }
            }
        }

        // Get block in (0, 0), which is expected to be from the noob line
        for (let y = 0; y < this.schematic.ysize; y++) {
            const block = this.getFromSchematic(0, y, 0);
            if (block) {
                this.supportBlock = block;
                break;
            }
        }

        // Recreate noobline
        this.minZ--; //accomodate for the noobline
        for (let x = this.minX; x <= this.maxX; x++) {
            const y = this.getHighestBlock(x, z1);
            const shade = this.getShade(x, y, z1);

            const noobLineKey = MapArtSchematic.getBlockKey(x, z1 - 1);
            const noobLineValue = {
                y : y,
                block : this.supportBlock,
                hasSupportingBlock: false,
                shade : MAP_SHADOW_BRIGHT
            };
 
            if (shade == MAP_SHADOW_BRIGHT) {
                //if block on (x, z1) is bright, noob line has to be lower
                noobLineValue.y--;
            }
            else if (shade == MAP_SHADOW_DARK) {
                noobLineValue.y++;
            }

            this.blocks.set(noobLineKey, noobLineValue);
        }
    }

    //Helper
    getFromSchematic(x, y, z) {
        const schematicKey = xyzToKey(x, y, z,
            this.schematic.xsize, this.schematic.ysize, this.schematic.zsize);
        return this.container.get(schematicKey);
    }

    isValidSize() {
        return this.schematic.xsize % 128 == 0 && this.schematic.zsize % 128 == 1;
    }

    isValidHeight() {
        return this.schematic.ysize > 0 && this.schematic.ysize < 320;
    }
    
    // Needs previous call to load() or loadFromSection()
    getHighestBlockInfo(x, z) {
        const blockKey = MapArtSchematic.getBlockKey(x, z);

        return this.blocks.get(blockKey);
    }
    
    getHighestBlock(x, z) {
        const highestBlockInfo = this.getHighestBlockInfo(x, z);
        if (highestBlockInfo === undefined) return this.minY;

        return highestBlockInfo.y;
    }

    getShade(x, y, z) {
        //A block's shade (light / medium / dark) is defined by the Y difference to the block north of it
        let yNorth;
        let blockInfoNorth = this.getHighestBlockInfo(x, z - 1);
        if (blockInfoNorth === undefined) {
            //Need to fetch from schematic itself. This happens if the area isn't loaded (loadFromSection)
            for (let iterY = this.schematic.ysize - 1; iterY >= 0; iterY--) {
                const blockNorth = this.getFromSchematic(x, iterY, z - 1);
                if (blockNorth !== undefined) {
                    yNorth = iterY;
                    break;
                }
            }
        }
        else {
            yNorth = blockInfoNorth.y;
        }

        if (yNorth == y) {
            return MAP_SHADOW_REGULAR;
        }
        else if (yNorth > y) {
            return MAP_SHADOW_DARK;
        }
        else {
            return MAP_SHADOW_BRIGHT;
        }
    }

    getStripBounds(x) {
        let lowest = undefined;
        let highest = undefined;

        for (let iterZ = this.minZ; iterZ <= this.maxZ; iterZ++) {
            const iterBlockInfo = this.getHighestBlockInfo(x, iterZ);
            if (iterBlockInfo === undefined) continue;

            const leastY = iterBlockInfo.y - (iterBlockInfo.hasSupportingBlock ? 1 : 0);
            if (lowest === undefined || leastY < lowest) {
                lowest = leastY;
            }
            if (highest === undefined || iterBlockInfo.y > highest) {
                highest = iterBlockInfo.y;
            }
        }
        return [lowest, highest];
    }

    // Move a map art strip (x-axis) to the desired y level on (x,z)
    moveStripVertically(x, yToMove, z, leeway) {
        const yInfo = this.getHighestBlockInfo(x, z);
        if (yInfo === undefined) throw "Invalid x, z coordinate";

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
            else if (iterBlockInfo.y <= this.minY) {
                this.minY = iterBlockInfo.y;

                if (iterBlockInfo.hasSupportingBlock)
                    this.minY--;
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

    // Some strips may be needlessly high, especially after using loadFromSection
    // This is the equivalent of rerunning with rebane's "Classic Mode", bringing strips down as most as possible
    moveStripsDown() {
        let newMaxY = undefined;

        // Iterate per strip
        for (let x = this.minX; x <= this.maxX; x++) {
            const [lowestY, highestY] = this.getStripBounds(x);

            let decrement = 0;
            if (lowestY > this.minY) {
                //bring this strip down to this.minY
                decrement = (lowestY - this.minY);

                for (let z = this.minZ; z <= this.maxZ; z++) {
                    const blockInfo = this.getHighestBlockInfo (x, z);

                    blockInfo.y -= decrement;
                }
            }

            if (newMaxY === undefined || highestY - decrement > newMaxY) {
                newMaxY = highestY - decrement;
            }
        }

        this.maxY = newMaxY;
    }
    
    // To be used after blocks are changed.
    // In case a litematic schematic with multiple regions was used, only the chosen region is returned
    toSchematic() {
        //console.log(`Creating new schematic ${this.maxX + 1} x ${this.maxY + 1} x ${this.maxZ + 1}`);

        const schematic = {
            blocks: new Map(),
            xsize: this.maxX - this.minX + 1,
            ysize: this.maxY - this.minY + 1,
            zsize: this.maxZ - this.minZ + 1
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
            
            const key = xyzToKey(x - this.minX, y - this.minY, z - this.minZ,
                schematic.xsize, schematic.ysize, schematic.zsize);
            container.set(key, block);

            if (blockInfo.hasSupportingBlock) {
                const key = xyzToKey(x - this.minX, y - this.minY - 1, z - this.minZ,
                    schematic.xsize, schematic.ysize, schematic.zsize);
                container.set(key, this.supportBlock);
            }
        }
        
        return schematic;
    }
}


export const MAP_SHADOW_DARK = 0;
export const MAP_SHADOW_REGULAR = 1;
export const MAP_SHADOW_BRIGHT = 2;
