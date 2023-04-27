const nbt = require('prismarine-nbt')

export function parseMinecraftSchematic(nbt, filename, consolidate = true) {
    const root = nbt.parsed.value;

    // Attempt .nbt
    try {
        return parseNbt(filename, root, consolidate);
    } catch { }

    //Attempt .litematic
    try {
        return parseLitematic(root, consolidate);
    } catch { }

    //Attempt .schem
    try {
        return parseSchem(filename, root, consolidate);
    } catch { }

    return null;
}

function parseNbt(filename, root, consolidate) {
    const size = root.size.value.value;

    const schematic = {
        blocks: new Map(),
        xsize: size[0],
        ysize: size[1],
        zsize: size[2]
    }

    if (!consolidate) {
        schematic.blocks.set(filename, new Map());
        schematic.regions = [filename];
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
            properties = [];
            for (const [key, value] of Object.entries(ref.Properties.value)) {
                properties.push(key + '=' + value.value);
            }
        }

        const x = block.pos.value.value[0];
        const y = block.pos.value.value[1];
        const z = block.pos.value.value[2];

        const key = xyzToKey(x, y, z, schematic.xsize, schematic.ysize, schematic.zsize);
        const val = [material, properties];
        if (consolidate) {
            schematic.blocks.set(key, val);
        }
        else {
            schematic.blocks.get(filename).set(key, val);
        }
    }

    return schematic;
}

function parseLitematic(root, consolidate) {
    const size = root.Metadata.value.EnclosingSize.value;

    const schematic = {
        blocks: new Map(),
        xsize: size.x.value,
        ysize: size.y.value,
        zsize: size.z.value
    }

    if (!consolidate) {
        schematic.regions = [];
    }

    const regionCount = root.Metadata.value.RegionCount.value;
    const regions = root.Regions.value;

    //A .litematic has 1+ regions
    for (const [regionName, val] of Object.entries(regions)) {
        if (!consolidate) {
            schematic.blocks.set(regionName, new Map());
            schematic.regions.push(regionName);
        }

        const region = val.value;

        const xsize = region.Size.value.x.value;
        const xsizeAbs = Math.abs(xsize);
        const ysize = region.Size.value.y.value;
        const ysizeAbs = Math.abs(ysize);
        const zsize = region.Size.value.z.value;
        const zsizeAbs = Math.abs(zsize);

        let xpos = region.Position.value.x.value;
        if (xsize < 0) {
            xpos %= xsize + 1;
        }
        let ypos = region.Position.value.y.value;
        if (ysize < 0) {
            ypos %= ysize + 1;
        }
        let zpos = region.Position.value.z.value;
        if (zsize < 0) {
            zpos %= zsize + 1;
        }

        const palette = region.BlockStatePalette.value.value;
        const blockStates = region.BlockStates.value;

        const bits = Math.max(2, Math.ceil(Math.log2(palette.length)));
        const vol = xsizeAbs * ysizeAbs * zsizeAbs;

        //Blocks
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
                        properties = [];
                        for (const [key, value] of Object.entries(ref.Properties.value)) {
                            properties.push(key + '=' + value.value);
                        }
                    }

                    const key = xyzToKey(xpos + x, ypos + y, zpos + z, size.x.value, size.y.value, size.z.value);
                    const val = [material, properties];
                    if (consolidate) {
                        schematic.blocks.set(key, val);
                    }
                    else {
                        schematic.blocks.get(regionName).set(key, val);
                    }
                }
            }
        }

        //Block Entities ("TileEntities")
        if (Object.keys(region).includes("TileEntities")) {
            let blockEntities;

            let blocks;
            if (consolidate) {
                schematic.blockEntities ||= [];
                blockEntities = schematic.blockEntities;
                blocks = schematic.blocks;
            }
            else {
                schematic.blockEntities ||= new Map();
                blockEntities = [];
                schematic.blockEntities.set(regionName, blockEntities);
                blocks = schematic.blocks.get(regionName);
            }

            const tileEntities = region.TileEntities.value.value;
            for (const tileEntity of tileEntities) {
                //Conversion from x,y,z to Pos (array of 3 integers)
                const data = {};
                let x, y, z;
                
                for (const [key, val] of Object.entries(tileEntity)) {
                    if (key === "x") {
                        x = val.value;
                    }
                    else if (key === "y") {
                        y = val.value;
                    }
                    else if (key === "z") {
                        z = val.value;
                    }
                    else {
                        data[key] = val;
                    }
                }

                if (x === undefined || y === undefined || z === undefined) {
                    console.log("Wrong TileEntities");
                    console.log(tileEntity);
                    continue;
                }

                const block = blocks.get(xyzToKey(xpos + x, ypos + y, zpos + z, schematic.xsize, schematic.ysize, schematic.zsize));
                if (!block) {
                    console.log("Wrong TileEntities");
                    console.log(tileEntity);
                    continue;
                }

                data.Pos = nbt.intArray([x, y, z]);
                data.Id = nbt.string(block[0]);

                blockEntities.push(data);
            }
        }

        //Position (used for entities)
        let offsetX = 0;
        let offsetY = 0;
        let offsetZ = 0;
        if (Object.keys(region).includes("Position")) {
            offsetX = region.Position.value.x.value;
            offsetY = region.Position.value.y.value;
            offsetZ = region.Position.value.z.value;
        }

        //Entities
        if (Object.keys(region).includes("Entities")) {
            let entities;

            if (consolidate) {
                schematic.entities ||= [];
                entities = schematic.entities;
            }
            else {
                schematic.entities ||= new Map();
                entities = [];
                schematic.entities.set(regionName, entities);
            }

            const entitiesLitematica = region.Entities.value.value;
            for (const entity of entitiesLitematica) {
                const data = {};

                for (const [key, val] of Object.entries(entity)) {
                    if (key === "id") {
                        data.Id = val;
                    }
                    else if (key === "Pos") {
                        const pos = val.value.value;
                        pos[0] += offsetX;
                        pos[1] += offsetY;
                        pos[2] += offsetZ;

                        data[key] = val;
                    }
                    else {
                        data[key] = val;
                    }
                }

                entities.push(data);
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

function parseSchem(filename, root, consolidate) {
    //https://github.com/SpongePowered/Schematic-Specification

    switch (root.Version.value) {
        case 1:
        case 2:
            return parseSchem1Or2(filename, root, consolidate);
    }
    return null;
}

function parseSchem1Or2(filename, root, consolidate) {
    const schematic = {
        blocks: new Map(),
        xsize: root.Width.value,
        ysize: root.Height.value,
        zsize: root.Length.value
    }

    if (!consolidate) {
        schematic.blocks.set(filename, new Map());
        schematic.regions = [filename];
    }

    //Convert palette
    const paletteMax = root.PaletteMax.value;
    const palette = new Array(paletteMax);
    for (const [mc_id, val] of Object.entries(root.Palette.value)) {
        palette[val.value] = mc_id;
    }

    const blocks = Object.values(root.BlockData.value); //this is in varint[] format
    //blocks.length may be greater than Width * Height * Length

    let key = 0;
    let i = 0;

    while (i < blocks.length) {
        let paletteIdx = 0;
        let varintLength = 0;

        while (true) {
            paletteIdx |= (blocks[i] & 127) << (varintLength++ * 7);
            if (varintLength > 5) {
                const err = 'VarInt too big (probably corrupted data)';
                console.error(err);
                throw err;
            }

            if ((blocks[i] & 128) != 128) {
                i++;
                break;
            }
            i++;
        }

        // key = (y * length + z) * width + x
        const mc_id = palette[paletteIdx];
        if (mc_id.endsWith(':air') || mc_id.endsWith('_air')) {
            key++;
            continue;
        }

        let material;
        let properties;

        const idx_first_property = mc_id.indexOf('[');
        if (idx_first_property >= 0) {
            material = mc_id.slice(0, idx_first_property);
            properties = mc_id.slice(idx_first_property + 1, -1);
            properties = properties.split(",");
        }
        else {
            material = mc_id;
            properties = null;
        }

        const val = [material, properties];
        if (consolidate) {
            schematic.blocks.set(key, val);
        }
        else {
            schematic.blocks.get(filename).set(key, val);
        }

        key++;
    }

    //Block Entities
    if (Object.keys(root).includes("BlockEntities")) {
        const blockEntities = root.BlockEntities.value.value;

        if (consolidate) {
            if (schematic.blockEntities) {
                schematic.blockEntities = schematic.blockEntities.concat(blockEntities);
            }
            else {
                schematic.blockEntities = blockEntities;
            }
        }
        else {
            schematic.blockEntities ||= new Map();
            schematic.blockEntities.set(filename, blockEntities);
        }
    }

    //Offset (used for entities)
    let offsetX = 0;
    let offsetY = 0;
    let offsetZ = 0;
    if (Object.keys(root).includes("Offset")) {
        if (Array.isArray(root.Offset.value)) {
            offsetX = root.Offset.value[0];
            offsetY = root.Offset.value[1];
            offsetZ = root.Offset.value[2];
        }
        else {
            offsetX = root.Offset.value.x.value;
            offsetY = root.Offset.value.y.value;
            offsetZ = root.Offset.value.z.value;
        }
    }

    //Entities
    if (Object.keys(root).includes("Entities")) {
        let entities;

        if (consolidate) {
            schematic.entities ||= [];
            entities = schematic.entities;
        }
        else {
            schematic.entities ||= new Map();
            entities = [];
            schematic.entities.set(filename, entities);
        }

        const entitiesSponge = root.Entities.value.value;
        for (const entity of entitiesSponge) {
            const data = {};

            for (const [key, val] of Object.entries(entity)) {
                if (key === "Pos") {
                    const pos = val.value.value;
                    pos[0] -= offsetX;
                    pos[1] -= offsetY;
                    pos[2] -= offsetZ;

                    data[key] = val;
                }
                else {
                    data[key] = val;
                }
            }

            entities.push(data);
        }
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

export function convertToSchem(schematic, region) {
    const paletteAux = new Map();
    const blockData = [];

    paletteAux.set('minecraft:air', 0);
    let newPaletteIdx = 1;

    // Prepare blocks
    const blocks = region ? schematic.blocks.get(region) : schematic.blocks;
    for (let y = 0; y < schematic.ysize; y++) {
        for (let z = 0; z < schematic.zsize; z++) {
            for (let x = 0; x < schematic.xsize; x++) {
                const key = xyzToKey(x, y, z, schematic.xsize, schematic.ysize, schematic.zsize);

                const data = blocks.get(key);
                let mc_id;

                if (data === undefined) {
                    mc_id = 'minecraft:air';
                }
                else {
                    mc_id = data[0];
                    if (data[1]) {
                        mc_id += "[" + data[1].join(",") + "]";
                    }
                }

                // Prepare palette
                let paletteIdx = paletteAux.get(mc_id);
                if (paletteIdx === undefined) {
                    paletteIdx = newPaletteIdx;

                    paletteAux.set(mc_id, newPaletteIdx);
                    newPaletteIdx++;
                }

                // Prepare block data
                while ((paletteIdx & -128) != 0) {
                    let val = paletteIdx & 127 | 128;
                    if (val >= 128) val -= 256; // Required as pnbt considers ubyte as -128 ~ 127
                    blockData.push(val);
                    paletteIdx >>>= 7;
                }
                blockData.push(paletteIdx);
            }
        }
    }

    // Prepare palette again
    const palette = {};
    for (const [key, val] of paletteAux.entries()) {
        palette[key] = nbt.int(val);
    }

    // Prepare block entities (e.g. Signs, Hoppers)
    let blockEntities;
    if (schematic.blockEntities) {
        blockEntities = region ? schematic.blockEntities.get(region) : schematic.blockEntities;
    }
    blockEntities ||= [];

    // Prepare entities (e.g. Minecarts)
    let entities;
    if (schematic.entities) {
        entities = region ? schematic.entities.get(region) : schematic.entities;
    }
    entities ||= [];

    const root = nbt.comp({
        Version: nbt.int(2),
        DataVersion: nbt.int(3120),
        Palette: nbt.comp(palette),
        PaletteMax: nbt.int(newPaletteIdx),
        Width: nbt.short(schematic.xsize),
        Height: nbt.short(schematic.ysize),
        Length: nbt.short(schematic.zsize),
        BlockData: nbt.byteArray(blockData),
        BlockEntities: nbt.list(nbt.comp(blockEntities)),
        Entities: nbt.list(nbt.comp(entities))
    }, "Schematic");
    
    const nbtData = nbt.writeUncompressed(root);
    return pako.gzip(nbtData);
}
