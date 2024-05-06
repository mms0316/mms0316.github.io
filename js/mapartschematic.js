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

        // Strips only consider the highest block of a (x, z) coordinate, but flags if there is a block below it.
        // (This assumes all supporting blocks are of the same type and that there are no more than 1 supporting block below)
        this.strips = undefined;
        this.supportBlock = undefined;

        this.minX = undefined;
        this.maxX = undefined;
        this.minZ = undefined;
        this.maxZ = undefined;
    }
    
    load() {
        // Make a different representation, to handle negative values throughout the functions

        this.minX = 0;
        this.maxX = this.schematic.xsize - 1;
        this.minZ = 0;
        this.maxZ = this.schematic.zsize - 1;

        this.strips = {};

        // Iterate vertically (per strip)
        for (let x = this.minX; x <= this.maxX; x++) {
            const stripsEntry = {
                blocks: {}
            };
            this.strips[x] = stripsEntry;

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

                        const blockInfo = {
                            y : y,
                            block : block,
                            hasSupportingBlock: hasSupportingBlock,
                            shade : this.getShade(x, y, z)
                        };

                        stripsEntry.blocks[z] = blockInfo;

                        break;
                    }
                }
            }
        }

        // Get block in (0, 0), which is expected to be from the noob line
        this.supportBlock = this.strips[0].blocks[0].block;
    }

    //Since the first line is a noob line, it's expected this function is called with z1 >= 1
    loadFromSection(x1, x2, z1, z2) {
        this.minX = x1;
        this.maxX = x2;
        this.minZ = z1;
        this.maxZ = z2;

        this.strips = {};

        // Iterate vertically (per strip)
        for (let x = x1; x <= x2; x++) {
            const stripsEntry = {
                blocks: {}
            };
            this.strips[x] = stripsEntry;

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

                        const blockInfo = {
                            y : y,
                            block : block,
                            hasSupportingBlock: hasSupportingBlock,
                            shade : this.getShade(x, y, z)
                        };
                        stripsEntry.blocks[z] = blockInfo;
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
            const y = this.strips[x].blocks[z1].y;
            const shade = this.getShade(x, y, z1);

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

            this.strips[x].blocks[z1 - 1] = noobLineValue;
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
    
    getShade(x, y, z) {
        //A block's shade (light / medium / dark) is defined by the Y difference to the block north of it
        let yNorth;
        let blockInfoNorth = this.strips[x].blocks[z - 1];
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

    optimizeStripHeight(x, { substitutions = DEFAULT_SUBSTITUTIONS } = {}) {
        let changed = false;
        const blocks = this.strips[x].blocks;

        for (let z = this.minZ + 1; z <= this.maxZ; z++) { //noobline is skipped
            const blockInfo = blocks[z];

            const subst = substitutions[blockInfo.block[0]];
            if (subst === undefined) {
                continue;
            }

            const boundsBefore = {};
            const boundsAfter = {};
            for (let zBefore = this.minZ; zBefore < z; zBefore++) {
                const iterBlock = blocks[zBefore];
                this.setMin(boundsBefore, iterBlock.y, iterBlock.hasSupportingBlock);
                this.setMax(boundsBefore, iterBlock.y);
            }
            for (let zAfter = z + 1; zAfter <= this.maxZ; zAfter++) {
                const iterBlock = blocks[zAfter];
                this.setMin(boundsAfter, iterBlock.y, iterBlock.hasSupportingBlock);
                this.setMax(boundsAfter, iterBlock.y);
            }

            const y = blockInfo.y;
            const yBefore = blocks[z - 1].y;

            let yToAdd;

            const maxYDiff = boundsAfter.maxY - boundsBefore.maxY;
            const minYDiff = boundsAfter.minY - boundsBefore.minY;

            let shade;
            if (y > yBefore) {
                shade = MAP_SHADOW_BRIGHT;
            }
            else if (y == yBefore) {
                shade = MAP_SHADOW_REGULAR;
            }
            else {
                shade = MAP_SHADOW_DARK;
            }

            const substOptions = subst[shade];
            if (substOptions === undefined) continue;

            let option;

            switch (shade) {
                case MAP_SHADOW_BRIGHT:
                    // block can change to:
                    // - regular shade: boundsAfter goes down (priority)
                    // - dark shade: boundsAfter goes down twice

                    option = substOptions[MAP_SHADOW_REGULAR];
                    if (option && (
                        option.mode == SUBSTITUTION_MODE_ALWAYS ||
                        (option.mode == SUBSTITUTION_MODE_Y_DIFF && (maxYDiff > 0 && minYDiff > 0))))
                    {
                        yToAdd = -1;

                        if (option.block)
                            blocks[z] = option.block;
                        break;
                    }

                    option = substOptions[MAP_SHADOW_DARK];
                    if (option && (
                        option.mode == SUBSTITUTION_MODE_ALWAYS ||
                        (option.mode == SUBSTITUTION_MODE_Y_DIFF && (maxYDiff >= 2 && minYDiff >= 2))))
                    {
                        yToAdd = -2;

                        if (option.block)
                            blocks[z] = option.block;
                        break;
                    }

                    break;

                case MAP_SHADOW_DARK:
                    // block can change to:
                    // - regular shade: boundsAfter goes up (priority)
                    // - bright shade: boundsAfter goes up twice
                    option = substOptions[MAP_SHADOW_REGULAR];
                    if (option && (
                        option.mode == SUBSTITUTION_MODE_ALWAYS ||
                        (option.mode == SUBSTITUTION_MODE_Y_DIFF && (maxYDiff < 0 && minYDiff < 0))))
                    {
                        yToAdd = 1;

                        if (option.block)
                            blocks[z] = option.block;
                        break;
                    }

                    option = substOptions[MAP_SHADOW_BRIGHT];
                    if (option && (
                        option.mode == SUBSTITUTION_MODE_ALWAYS ||
                        (option.mode == SUBSTITUTION_MODE_Y_DIFF && (maxYDiff <= -2 && minYDiff <= -2))))
                    {
                        yToAdd = 2;

                        if (option.block)
                            blocks[z] = option.block;
                        break;
                    }

                    break;

                default:
                    // block can change to:
                    // - bright shade: boundsAfter goes up
                    // - dark shade: boundsAfter goes down
                    option = substOptions[MAP_SHADOW_BRIGHT];
                    if (option && (
                        option.mode == SUBSTITUTION_MODE_ALWAYS ||
                        (option.mode == SUBSTITUTION_MODE_Y_DIFF && (maxYDiff < 0 && minYDiff < 0))))
                    {
                        yToAdd = 1;

                        if (option.block)
                            blocks[z] = option.block;
                        break;
                    }

                    if (option && (
                        option.mode == SUBSTITUTION_MODE_ALWAYS ||
                        (option.mode == SUBSTITUTION_MODE_Y_DIFF && (maxYDiff > 0 && minYDiff > 0))))
                    {
                        yToAdd = -1;

                        if (option.block)
                            blocks[z] = option.block;
                        break;
                    }

                    break;
            }

            if (yToAdd === undefined) continue;

            for (let zChange = z; zChange <= this.maxZ; zChange++) {
                blocks[zChange].y += yToAdd;
            }

            changed = true;
        }

        return changed;
    }

    getStripBounds(x) {
        const bounds = {
            minY : undefined,
            maxY : undefined
        }

        for (const blockInfo of Object.values(this.strips[x].blocks)) {
            this.setMin(bounds, blockInfo.y, blockInfo.hasSupportingBlock);
            this.setMax(bounds, blockInfo.y);
        }

        return bounds;
    }

    getBounds() {
        const bounds = {
            minY : undefined,
            maxY : undefined
        }

        for (const strip of Object.values(this.strips)) {
            for (const blockInfo of Object.values(strip.blocks)) {
                this.setMin(bounds, blockInfo.y, blockInfo.hasSupportingBlock);
                this.setMax(bounds, blockInfo.y);
            }
        }

        return bounds;
    }

    // Move a map art strip (x-axis) to the desired y level on (x,z)
    moveStripVertically(x, yToMove, z, leeway) {
        const yInfo = this.strips[x].blocks[z];
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
            const iterBlockInfo = this.strips[x].blocks[iterZ];

            iterBlockInfo.y += yToAdd;
        }
    }


    setMin(obj, y, hasSupportingBlock) {
        if (obj.minY === undefined || y <= obj.minY) {
            obj.minY = y;
            if (hasSupportingBlock) {
                obj.minY--;
            }
        }
    }
    setMax(obj, y) {
        if (obj.maxY === undefined || y > obj.maxY) {
            obj.maxY = y;
        }
    }

    // Checks minY / maxY for out of bounds, moving areas together (instead of per strip)
    // If a strip becomes over maxHeight, stops processing further
    normalizeContiguous(maxHeight, xStart = this.minX) {
        let oob;
        const bounds = {
            minY : undefined,
            maxY : undefined
        }

        // Check for out of bounds
        for (let x = xStart; x <= this.maxX; x++) {
            const strip = this.strips[x];
            if (strip === undefined) continue;

            for (const blockInfo of Object.values(strip.blocks)) {
                // Calcule min/max globally
                this.setMin(bounds, blockInfo.y, blockInfo.hasSupportingBlock);
                this.setMax(bounds, blockInfo.y);
            }

            if (bounds.maxY - bounds.minY + 1 >= maxHeight) {
                oob = x;
                break;
            }
        }

        const maxX = (oob === undefined) ? this.maxX + 1 : oob;

        // Normalize strips before oob
        if (bounds.minY != 0) {
            for (let x = xStart; x < maxX; x++) {
                for (const blockInfo of Object.values(this.strips[x].blocks)) {
                    blockInfo.y -= bounds.minY;
                }
            }
        }

        return oob;
    }

    normalizeStrip(x) {
        const bounds = this.getStripBounds(x);

        if (bounds.minY == 0) return;

        const strip = this.strips[x];
        for (const blockInfo of Object.values(strip.blocks)) {
            blockInfo.y -= bounds.minY;
        }
    }

    // To be used after blocks are changed.
    // In case a litematic schematic with multiple regions was used, only the chosen region is returned
    toSchematic() {
        //console.log(`Creating new schematic ${this.maxX + 1} x ${this.maxY + 1} x ${this.maxZ + 1}`);

        const bounds = this.getBounds();

        const schematic = {
            blocks: new Map(),
            xsize: this.maxX - this.minX + 1,
            ysize: bounds.maxY - bounds.minY + 1,
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
        
        for (const [x_str, strip] of Object.entries(this.strips)) {
            const x = +x_str;
            for (const [z_str, blockInfo] of Object.entries(strip.blocks)) {
                const y = blockInfo.y;
                const z = +z_str;
                const block = blockInfo.block;
                
                const key = xyzToKey(x - this.minX, y - bounds.minY, z - this.minZ,
                    schematic.xsize, schematic.ysize, schematic.zsize);
                container.set(key, block);

                if (blockInfo.hasSupportingBlock) {
                    const key = xyzToKey(x - this.minX, y - bounds.minY - 1, z - this.minZ,
                        schematic.xsize, schematic.ysize, schematic.zsize);
                    container.set(key, this.supportBlock);
                }
            }
        }
        
        return schematic;
    }
}


export const MAP_SHADOW_DARK = 0;
export const MAP_SHADOW_REGULAR = 1;
export const MAP_SHADOW_BRIGHT = 2;

//for optimizeStripHeight
export const SUBSTITUTION_MODE_ALWAYS = 0;
export const SUBSTITUTION_MODE_Y_DIFF = 1;

export const DEFAULT_SUBSTITUTIONS = {};
DEFAULT_SUBSTITUTIONS['minecraft:black_wool'] = {};
DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_DARK] = {};
DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_DARK][MAP_SHADOW_REGULAR] = {
    mode : SUBSTITUTION_MODE_ALWAYS,
    block : null //keep
};

DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_REGULAR] = {};
DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_REGULAR][MAP_SHADOW_DARK] = {
    mode : SUBSTITUTION_MODE_Y_DIFF,
    block : null //keep
};
DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_REGULAR][MAP_SHADOW_BRIGHT] = {
    mode : SUBSTITUTION_MODE_Y_DIFF,
    block : null //keep
};

DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_BRIGHT] = {};
DEFAULT_SUBSTITUTIONS['minecraft:black_wool'][MAP_SHADOW_BRIGHT][MAP_SHADOW_REGULAR] = {
    mode : SUBSTITUTION_MODE_Y_DIFF,
    block : null //keep
};

//I might later also add:
// clay dark -> stone bright
// clay regular -> cobweb dark
// dirt dark <-> brown_wool bright
// stone dark <-> gray_wool bright
// light_gray dark <-> stone bright
// spruce regular <-> dirt dark
// spruce regular <-> brown_wool bright
// netherrack dark <-> crimson_hyphae regular
// orange_tc bright -> orange_wool dark
// magenta_tc dark <-> purple_tc regular
// lime_tc dark <-> green_tc bright
// gray_tc dark <-> black_tc bright
// cyan_tc dark -> gray_wool regular
// cyan_tc regular -> stone dark
// brown_tc dark -> gray_tc regular
// green_tc bright <-> lime_tc dark
