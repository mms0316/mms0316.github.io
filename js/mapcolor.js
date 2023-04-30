const nbt = require('prismarine-nbt')

import { MINECRAFT_COLORS } from './materialcolors.js';
import { xyzToKey } from './schematics.js';

export function xzToKey(x, z, xsize, zsize) {
    return x * zsize + z;
}

export function keyToXz(coords, xsize, zsize) {
    const z = coords % zsize;
    const x = (coords - z) / zsize;
    return [x, z];
}

export function calculateMaxHeights(schematic) {
    const maxHeights = new Map();

    for (let z = 0; z < schematic.zsize; z++) {
        for (let x = 0; x < schematic.xsize; x++) {
            let maxY = -1;

            // Search existing block, starting from highest schematic's y level
            for (let y = schematic.ysize - 1; y >= 0; y--) {
                const schematicKey = xyzToKey(x, y, z, schematic.xsize, schematic.ysize, schematic.zsize);
                const schematicVal = schematic.blocks.get(schematicKey);
                if (!schematicVal) continue;
                const [material, properties] = schematicVal;
                const colors = getColorsArray(material, properties);
                if (!colors) continue;

                maxY = y;
                break;
            }

            if (maxY >= 0) {
                const key = xzToKey(x, z, schematic.xsize, schematic.zsize);
                maxHeights.set(key, maxY);

                //console.log(`Max height (${x},${z}) = ${maxY}`);
            }
        }
    }

    return maxHeights;
}

export function calculateBlockData(schematic, maxHeights) {
    const blockData = [];
    const palette = new Map();

    for (const [key, y] of maxHeights.entries()) {
        // Handle blocks
        const [x, z] = keyToXz(key, schematic.xsize, schematic.zsize);
        const schematicKey = xyzToKey(x, y, z, schematic.xsize, schematic.ysize, schematic.zsize);
        const schematicVal = schematic.blocks.get(schematicKey);
        const [material, properties] = schematicVal;
        const colors = getColorsArray(material, properties);
        calculateBlockDataInternal(blockData, schematic, maxHeights, material, properties, x, y, z, colors);

        // Handle palette
        const val = palette.get(material) || 0;
        palette.set(material, val + 1);
    }

    // Palette
    const sortedPalette = [...palette].sort(function (a, b) {
        return b[1] - a[1];
    });

    return [blockData, sortedPalette];
}

const MC_PREFIX = "minecraft:";

function getColorsArray(material, properties) {
    let colors;

    // Remove "minecraft:"
    let colorKey = material;
    if (colorKey.startsWith(MC_PREFIX)) {
        colorKey = material.substring(MC_PREFIX.length);
    }

    if (properties) {
        for (const p of properties) {
            colors = MINECRAFT_COLORS.get(colorKey + "[" + p + "]");
            if (colors) break;
        }
    }
    if (!colors) {
        colors = MINECRAFT_COLORS.get(colorKey);
    }

    if (!colors)
        return null;
    if (colors.length != 3)
        return null;

    return colors;
}

// Map shadow (as a block is viewed through a minecraft map)
const MAP_SHADOW_DARK = 0;
const MAP_SHADOW_REGULAR = 1;
const MAP_SHADOW_BRIGHT = 2;

function calculateBlockDataInternal(blockData, schematic, maxHeights, material, properties, x, y, z, colors) {
    let color, mapShadow;

    // The shade of this (x,y,z) is defined by the highest block in (x, z-1)
    // z-1 is the block to the north of z
    let yNorth = -1;
    if (z > 0) {
        const xzKey = xzToKey(x, z - 1, schematic.xsize, schematic.zsize);
        const val = maxHeights.get(xzKey);
        if (val !== undefined) {
            yNorth = val;
        }
    }

    if (yNorth < y) {
        mapShadow = MAP_SHADOW_BRIGHT;
    }
    else if (yNorth == y) {
        mapShadow = MAP_SHADOW_REGULAR;
    }
    else {
        mapShadow = MAP_SHADOW_DARK;
    }

    const colorArray = colors[mapShadow];

    const data = {
        coords: [x, y, z],
        color: colorArray
    };

    blockData.push(data);
}
