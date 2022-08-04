export function parseMinecraftSchematic(nbt, filename) {
    const root = nbt.parsed.value;

    // Attempt .nbt
    try {
        return parseNbt(filename, root);
    } catch { }

    //Attempt .litematic
    try {
        return parseLitematic(root);
    } catch { }

    //Attempt .schem
    try {
        return parseSchem(filename, root);
    } catch { }

    return null;
}

function parseNbt(filename, root) {
    const size = root.size.value.value;

    const schematic = {
        blocks: new Map(),
        xsize: size[0],
        ysize: size[1],
        zsize: size[2]
    }

    const palette = Object.values(root.palette.value.value);
    const blocks = Object.values(root.blocks.value.value);

    for (const block of blocks) {
        const ref = palette[block.state.value];
        const material = ref.Name.value;
        if (material.endsWith(':air') || material.endsWith('_air'))
            continue;

        let properties = null;
        if (Object.keys(ref).includes('Properties')) {
            properties = '';
            for (const [key, value] of Object.entries(ref.Properties.value)) {
                properties += '[' + key + '=' + value.value + ']';
            }
        }

        const x = block.pos.value.value[0];
        const y = block.pos.value.value[1];
        const z = block.pos.value.value[2];

        const key = xyzToKey(x, y, z, schematic.xsize, schematic.ysize, schematic.zsize);
        schematic.blocks.set(key, [material, properties]);
    }

    return schematic;
}

function parseLitematic(root) {
    const size = root.Metadata.value.EnclosingSize.value;

    const schematic = {
        blocks: new Map(),
        xsize: size.x.value,
        ysize: size.y.value,
        zsize: size.z.value
    }

    const regionCount = root.Metadata.value.RegionCount.value;
    const regions = root.Regions.value;

    //A .litematic has 1+ regions
    for (const [regionName, val] of Object.entries(regions)) {
        const region = val.value;

        const xsize = region.Size.value.x.value;
        const xsizeAbs = Math.abs(xsize);
        const ysize = region.Size.value.y.value;
        const ysizeAbs = Math.abs(ysize);
        const zsize = region.Size.value.z.value;
        const zsizeAbs = Math.abs(zsize);

        let xpos = region.Position.value.x.value;
        if (xsize < 0) {
            xpos += xsize + 1;
        }
        let ypos = region.Position.value.y.value;
        if (ysize < 0) {
            ypos += ysize + 1;
        }
        let zpos = region.Position.value.z.value;
        if (zsize < 0) {
            zpos += zsize + 1;
        }

        const palette = region.BlockStatePalette.value.value;
        const blockStates = region.BlockStates.value;

        const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
        const vol = xsizeAbs * ysizeAbs * zsizeAbs;

        for (let y = 0; y < ysizeAbs; y++) {
            for (let z = 0; z < zsizeAbs; z++) {
                for (let x = 0; x < xsizeAbs; x++) {
                    const idx = getLitematicaPaletteIdx(x, y, z, xsizeAbs, ysizeAbs, zsizeAbs, vol, bits, blockStates);

                    const ref = palette[idx];
                    const material = ref.Name.value;
                    if (material.endsWith(':air') || material.endsWith('_air'))
                        continue;

                    let properties = null;
                    if (Object.keys(ref).includes('Properties')) {
                        properties = '';
                        for (const [key, value] of Object.entries(ref.Properties.value)) {
                            properties += '[' + key + '=' + value.value + ']';
                        }
                    }

                    const key = xyzToKey(xpos + x, ypos + y, zpos + z, size.x.value, size.y.value, size.z.value);
                    schematic.blocks.set(key, [material, properties]);
                }
            }
        }
    }

    return schematic;
}

function getLitematicaPaletteIdx(x, y, z, xsize, ysize, zsize, vol, bits, blockStates) {
    let paletteIdx;
    const index = (y * xsize * zsize) + z * xsize + x;

    const startOffset = index * bits;
    const startArrIndex = startOffset >>> 6; //div 64
    const endArrIndex = ((index + 1) * bits - 1) >>> 6; //div 64
    const startBitOffset = startOffset & 0x3F; //and 64

    const maxEntryValue = BigInt((1 << bits) - 1);

    // Remove negatives because BigInt deals with signed
    const startLong = (BigInt(blockStates[startArrIndex][0] >>> 0) << 32n) | (BigInt(blockStates[startArrIndex][1] >>> 0));

    if (startArrIndex == endArrIndex) {
        paletteIdx = startLong >> BigInt(startBitOffset);
    }
    else {
        const endOffset = BigInt(64 - startBitOffset);

        // Remove negatives because BigInt deals with signed
        const endLong = (BigInt(blockStates[endArrIndex][0] >>> 0) << 32n) | (BigInt(blockStates[endArrIndex][1] >>> 0));

        paletteIdx = startLong >> BigInt(startBitOffset) | endLong << endOffset;
    }
    paletteIdx &= maxEntryValue;

    return paletteIdx;
}

function parseSchem(filename, root) {
    //https://github.com/SpongePowered/Schematic-Specification

    switch (root.Version.value) {
        case 1:
        case 2:
            return parseSchem1Or2(filename, root);
    }
    return null;
}

//this hasn't really been tested, let me know if there are issues
function parseSchem1Or2(filename, root) {
    const schematic = {
        blocks: new Map(),
        xsize: root.Width.value,
        ysize: root.Height.value,
        zsize: root.Length.value
    }

    //Convert palette
    const paletteMax = root.PaletteMax.value;
    const palette = new Array(paletteMax);
    for (const [mc_id, val] of Object.entries(root.Palette.value)) {
        palette[val.value] = mc_id;
    }

    const blocks = Object.values(root.BlockData.value);
    for (let key = 0; key < blocks.length; key++) {
        //The entries are indexed by x + z * Width + y * Width * Length
        //schematic already uses that format
        const paletteIdx = blocks[key];

        const mc_id = palette[paletteIdx];
        if (mc_id.endsWith(':air') || mc_id.endsWith('_air'))
            continue;

        let material;
        let properties;

        const idx_first_property = mc_id.indexOf('[');
        if (idx_first_property >= 0) {
            material = mc_id.substr(0, idx_first_property);
            properties = mc_id.substr(idx_first_property);
        }
        else {
            material = mc_id;
            properties = null;
        }

        schematic.blocks.set(key, [material, properties]);
    }

    return schematic;
}

export function xyzToKey(x, y, z, xsize, ysize, zsize) {
    return (y * xsize * zsize) + z * xsize + x;
}

export function keyToXyz(coords, xsize, ysize, zsize) {
    const x = coords % xsize;
    const aux = (coords - x) / xsize; // (y * zsize) + z
    const z = aux % zsize;
    const y = (aux - z) / zsize;
    return [x, y, z];
}
