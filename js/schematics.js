const nbt = require('prismarine-nbt')

export function parseMinecraftSchematic(nbt, filename, {consolidate = true, getPalette = false} = {}) {
    const root = nbt.parsed.value;

    // Attempt .nbt
    try {
        return parseNbt(filename, root, {consolidate, getPalette});
    } catch { }

    //Attempt .litematic
    try {
        return parseLitematic(root, {consolidate, getPalette});
    } catch { }

    //Attempt .schem
    try {
        return parseSchem(filename, root, {consolidate, getPalette});
    } catch { }

    return null;
}

function parseNbt(filename, root, {consolidate, getPalette}) {
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

	schematic.dataVersion = root.DataVersion.value;
    const palette = Object.values(root.palette.value.value);
    const blocks = Object.values(root.blocks.value.value);

    if (getPalette) {
        schematic.palette = [];

        for (const pal of palette) {
            const material = pal.Name.value;
            if (material.endsWith(':air') || material.endsWith('_air'))
                continue;
            let properties = null;
            if (Object.hasOwn(pal, 'Properties')) {
                properties = [];
                for (const [key, value] of Object.entries(pal.Properties.value)) {
                    properties.push(key + '=' + value.value);
                }
            }

            schematic.palette.push([material, properties]);
        }
    }

    for (const block of blocks) {
        const ref = palette[block.state.value];
        const material = ref.Name.value;
        if (material.endsWith(':air') || material.endsWith('_air'))
            continue;

        let properties = null;
        if (Object.hasOwn(ref, 'Properties')) {
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

function parseLitematic(root, {consolidate, getPalette}) {
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

    if (getPalette) {
        schematic.palette = [];
    }
	
	schematic.dataVersion = root.MinecraftDataVersion.value;
	schematic.litematicVersion = root.Version.value;

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

        // Palette
        if (getPalette) {
            for (const pal of palette) {
                const material = pal.Name.value;
                if (material.endsWith(':air') || material.endsWith('_air'))
                    continue;
                let properties = null;
                if (Object.hasOwn(pal, 'Properties')) {
                    properties = [];
                    for (const [key, value] of Object.entries(pal.Properties.value)) {
                        properties.push(key + '=' + value.value);
                    }
                }
    
                schematic.palette.push([material, properties]);
            }
        }

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
                    if (Object.hasOwn(ref, 'Properties')) {
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
        if (Object.hasOwn(region, "TileEntities")) {
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
        if (Object.hasOwn(region, "Position")) {
            offsetX = region.Position.value.x.value;
            offsetY = region.Position.value.y.value;
            offsetZ = region.Position.value.z.value;
        }

        //Entities
        if (Object.hasOwn(region, "Entities")) {
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

function parseSchem(filename, root, {consolidate, getPalette}) {
    //https://github.com/SpongePowered/Schematic-Specification

    if (Object.hasOwn(root, 'Version')) {
        switch (root.Version.value) {
            case 1:
            case 2:
                return parseSchem1Or2(filename, root, {consolidate, getPalette});
        }
    }

    if (Object.hasOwn(root, 'Schematic') && Object.hasOwn(root.Schematic.value, 'Version')) {
        switch (root.Schematic.value.Version.value) {
            case 3:
                return parseSchem3(filename, root, {consolidate, getPalette});
        }
    }
    return null;
}

function parseSchem1Or2(filename, root, {consolidate, getPalette}) {
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

	schematic.dataVersion = root.DataVersion.value;

    //Convert palette
    const paletteMax = root.PaletteMax.value;
    const palette = new Array(paletteMax);
    for (const [mc_id, val] of Object.entries(root.Palette.value)) {
        palette[val.value] = mc_id;
    }

    if (getPalette) {
        schematic.palette = [];

        for (const mc_id of Object.keys(root.Palette.value)) {
            if (mc_id.endsWith(':air') || mc_id.endsWith('_air'))
                continue;

            const matPropArray = splitMaterialProperties(mc_id);

            schematic.palette.push(matPropArray);
        }
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

        const matPropArray = splitMaterialProperties(mc_id);
        if (consolidate) {
            schematic.blocks.set(key, matPropArray);
        }
        else {
            schematic.blocks.get(filename).set(key, matPropArray);
        }

        key++;
    }

    //Block Entities
    if (Object.hasOwn(root, "BlockEntities")) {
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
    if (Object.hasOwn(root, "Offset")) {
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
    if (Object.hasOwn(root, "Entities")) {
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

function parseSchem3(filename, root, {consolidate, getPalette}) {
    root = root.Schematic.value;

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

	schematic.dataVersion = root.DataVersion.value;

    //Convert palette
    const palette = [];
    for (const [mc_id, val] of Object.entries(root.Blocks.value.Palette.value)) {
        palette[val.value] = mc_id;
    }

    if (getPalette) {
        schematic.palette = [];

        for (const mc_id of Object.keys(root.Blocks.value.Palette.value)) {
            if (mc_id.endsWith(':air') || mc_id.endsWith('_air'))
                continue;

            const matPropArray = splitMaterialProperties(mc_id);

            schematic.palette.push(matPropArray);
        }
    }

    const blocks = Object.values(root.Blocks.value.Data.value); //this is in varint[] format
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

        const matPropArray = splitMaterialProperties(mc_id);
        if (consolidate) {
            schematic.blocks.set(key, matPropArray);
        }
        else {
            schematic.blocks.get(filename).set(key, matPropArray);
        }

        key++;
    }

    //Block Entities
    if (Object.hasOwn(root.Blocks.value, "BlockEntities")) {
        const blockEntities = root.Blocks.value.BlockEntities.value.value;

        //Adjust v3 format to v2 format
        for (const blockEntity of blockEntities) {
            blockEntity.Items = blockEntity.Data.value.Items;
            delete blockEntity.Data;
        }

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

    //Entities
    if (Object.hasOwn(root, "Entities")) {
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
            const data = entity;

            for (const [key, val] of Object.entries(entity.Data.value)) {
                if (key !== "Pos") { //flattened position already has the subtracted offset needed
                    data[key] = val;
                }
            }

            delete entity.Data;

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

export function splitMaterialProperties(materialProperties) {
    let material;
    let properties;

    const idx_first_property = materialProperties.indexOf('[');
    if (idx_first_property >= 0) {
        material = materialProperties.slice(0, idx_first_property);
        properties = materialProperties.slice(idx_first_property + 1, -1);
        properties = properties.split(",");
    }
    else {
        material = materialProperties;
        properties = null;
    }

    return [material, properties];
}

export function convertToSchem(schematic, region) {
    const paletteAux = new Map();
    
    let blockDataSize = schematic.ysize * schematic.zsize * schematic.xsize; //this may be incremented later, in case there are over 127 different materials x properties

    paletteAux.set('minecraft:air', 0); //dedicate #0 to air
    let newPaletteIdx = 1;

    // Prepare palette
    const blocks = region ? schematic.blocks.get(region) : schematic.blocks;
    
    const keyMax = blockDataSize;
    for (let key = 0; key < keyMax; key++) {
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

        // Calculate block size in bytes
        while ((paletteIdx & -128) != 0) {
            blockDataSize++;
            paletteIdx >>>= 7;
        }
    }
    
    // Prepare blocks. This became a second loop due to OOM issues
    const blockData = new Int8Array(blockDataSize);
    let blockDataIdx = 0;

    for (let key = 0; key < keyMax; key++) {
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

        let paletteIdx = paletteAux.get(mc_id);

        // Prepare block data
        while ((paletteIdx & -128) != 0) {
            let val = paletteIdx & 127 | 128;
            if (val >= 128) val -= 256; // Required as pnbt considers ubyte as -128 ~ 127
            blockData[blockDataIdx] = val;
            blockDataIdx++;
            paletteIdx >>>= 7;
        }
        blockData[blockDataIdx] = paletteIdx;
        blockDataIdx++;
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

    // Prepare metadata
    const metadata = {};

    if (schematic.date == undefined) {
        schematic.date = Date.now();
    }

    //prismarine nbt shenanigans
    const date = BigInt(schematic.date);
    const prismarineLong = [Number(BigInt.asIntN(32, (date >> 32n))), Number(BigInt.asIntN(32, date))]
    metadata.Date = nbt.long(prismarineLong);

    //Extension
    if (schematic.imagePreview) {
        metadata.PreviewImageData = nbt.intArray(schematic.imagePreview);
    }

    const root = nbt.comp({
        Version: nbt.int(2),
        DataVersion: nbt.int(schematic.dataVersion || detectDataVersion(palette)),
        Palette: nbt.comp(palette),
        PaletteMax: nbt.int(newPaletteIdx),
        Width: nbt.short(schematic.xsize),
        Height: nbt.short(schematic.ysize),
        Length: nbt.short(schematic.zsize),
        BlockData: nbt.byteArray(blockData),
        BlockEntities: nbt.list(nbt.comp(blockEntities)),
        Entities: nbt.list(nbt.comp(entities)),
        Metadata: nbt.comp(metadata),
        Offset: nbt.intArray([0, 0, 0])
    }, "Schematic");
    
    const nbtData = nbt.writeUncompressed(root);
    return pako.gzip(nbtData);
}

const reText = /^(-?\d+) (-?\d+) (-?\d+) (.+)$/;
const CRLF = String.fromCharCode(13, 10); //new line
const reNewLine = /\r?\n/;

//Custom .txt format with lines such as: X Y Z minecraft:material[prop1=val1,prop2=val2]
export function parseTxt(txt) {
    let minX = NaN;
    let minY = NaN;
    let minZ = NaN;
    let maxX = NaN;
    let maxY = NaN;
    let maxZ = NaN;
    const blocks = [];

    for (const line of txt.split(reNewLine)) {
        if (line === "") continue;

        const block = reText.exec(line);
        if (!block) {
            console.log("Unknown line " + line);
            return null;
        }
        
        const [_, xStr, yStr, zStr, materialProperties] = block;
        const x = +xStr;
        const y = +yStr;
        const z = +zStr;

        if (!(minX <= x)) minX = x;
        if (!(minY <= y)) minY = y;
        if (!(minZ <= z)) minZ = z;
        if (!(maxX >= x)) maxX = x;
        if (!(maxY >= y)) maxY = y;
        if (!(maxZ >= z)) maxZ = z;
        
        blocks.push([x, y, z, materialProperties]);
    }

    const schematic = {
        blocks: new Map(),
        xsize: maxX - minX + 1,
        ysize: maxY - minY + 1,
        zsize: maxZ - minZ + 1
    }

    for (const block of blocks) {
        const [x, y, z, materialProperties] = block;
        const schematicKey = xyzToKey(x - minX, y - minY, z - minZ, schematic.xsize, schematic.ysize, schematic.zsize);
        const matPropArray = splitMaterialProperties(materialProperties);
        schematic.blocks.set(schematicKey, matPropArray);
    }

    return schematic;
}

export function convertToTxt(schematic) {
    const data = [];

    for (const [schematicKey, schematicVal] of schematic.blocks.entries()) {
        // Handle normal blocks
        const [x, y, z] = keyToXyz(schematicKey, schematic.xsize, schematic.ysize, schematic.zsize);
        const [material, properties] = schematicVal;

        data.push({
            x: x,
            y: y,
            z: z,
            material: material,
            properties: properties
        });
    }

    data.sort(function(a, b) {
        if (a.y != b.y) return a.y - b.y;
        if (a.x != b.x) return a.x - b.x;
        if (a.z != b.z) return a.z - b.z;
    });

    return data.map(function(e) {
        let materialProperties = e.material;
        if (e.properties) {
            materialProperties += '[' + e.properties + ']';
        }
        return `${e.x} ${e.y} ${e.z} ${materialProperties}`;
    }).join(CRLF);
}

function detectDataVersion(paletteSponge) {
    //Considers wiki when it first appeared (even if experimental flag was needed)
    const palette = new Map();
    for (const k of Object.keys(paletteSponge)) {
        let start = k.indexOf(':'); //skips "minecraft:"
        start = (start == -1) ? 0 : start + 1;

        let end = k.indexOf('['); //skips block state
        end = (end == -1) ? undefined : end - 1;

        const strippedKey = k.substring(start, end);

        palette.set(strippedKey, 1);
    }

    let dataVersion;

    dataVersion = 3837; //1.20.5
    if (palette.has('heavy_core')) return dataVersion;
    if (palette.has('vault')) return dataVersion;

    dataVersion = 3698; //1.20.3
    if (palette.has('short_grass')) return dataVersion;
    if (palette.has('crafter')) return dataVersion;
    if (palette.has('trial_spawner')) return dataVersion;
    if (palette.has('chiseled_copper')) return dataVersion;
    if (palette.has('exposed_chiseled_copper')) return dataVersion;
    if (palette.has('weathered_chiseled_copper')) return dataVersion;
    if (palette.has('oxidized_chiseled_copper')) return dataVersion;
    if (palette.has('waxed_chiseled_copper')) return dataVersion;
    if (palette.has('waxed_exposed_chiseled_copper')) return dataVersion;
    if (palette.has('waxed_weathered_chiseled_copper')) return dataVersion;
    if (palette.has('waxed_oxidized_chiseled_copper')) return dataVersion;
    if (palette.has('copper_bulb')) return dataVersion;
    if (palette.has('exposed_copper_bulb')) return dataVersion;
    if (palette.has('weathered_copper_bulb')) return dataVersion;
    if (palette.has('oxidized_copper_bulb')) return dataVersion;
    if (palette.has('waxed_copper_bulb')) return dataVersion;
    if (palette.has('waxed_exposed_copper_bulb')) return dataVersion;
    if (palette.has('waxed_weathered_copper_bulb')) return dataVersion;
    if (palette.has('waxed_oxidized_copper_bulb')) return dataVersion;
    if (palette.has('copper_grate')) return dataVersion;
    if (palette.has('exposed_copper_grate')) return dataVersion;
    if (palette.has('weathered_copper_grate')) return dataVersion;
    if (palette.has('oxidized_copper_grate')) return dataVersion;
    if (palette.has('waxed_copper_grate')) return dataVersion;
    if (palette.has('waxed_exposed_copper_grate')) return dataVersion;
    if (palette.has('waxed_weathered_copper_grate')) return dataVersion;
    if (palette.has('waxed_oxidized_copper_grate')) return dataVersion;
    if (palette.has('copper_door')) return dataVersion;
    if (palette.has('exposed_copper_door')) return dataVersion;
    if (palette.has('weathered_copper_door')) return dataVersion;
    if (palette.has('oxidized_copper_door')) return dataVersion;
    if (palette.has('waxed_copper_door')) return dataVersion;
    if (palette.has('waxed_exposed_copper_door')) return dataVersion;
    if (palette.has('waxed_weathered_copper_door')) return dataVersion;
    if (palette.has('waxed_oxidized_copper_door')) return dataVersion;
    if (palette.has('copper_trapdoor')) return dataVersion;
    if (palette.has('exposed_copper_trapdoor')) return dataVersion;
    if (palette.has('weathered_copper_trapdoor')) return dataVersion;
    if (palette.has('oxidized_copper_trapdoor')) return dataVersion;
    if (palette.has('waxed_copper_trapdoor')) return dataVersion;
    if (palette.has('waxed_exposed_copper_trapdoor')) return dataVersion;
    if (palette.has('waxed_weathered_copper_trapdoor')) return dataVersion;
    if (palette.has('waxed_oxidized_copper_trapdoor')) return dataVersion;
    if (palette.has('tuff_stairs')) return dataVersion;
    if (palette.has('tuff_slab')) return dataVersion;
    if (palette.has('tuff_slab')) return dataVersion;
    if (palette.has('tuff_wall')) return dataVersion;
    if (palette.has('chiseled_tuff')) return dataVersion;
    if (palette.has('polished_tuff_stairs')) return dataVersion;
    if (palette.has('polished_tuff_slab')) return dataVersion;
    if (palette.has('polished_tuff_wall')) return dataVersion;
    if (palette.has('tuff_bricks')) return dataVersion;
    if (palette.has('tuff_bricks')) return dataVersion;
    if (palette.has('tuff_bricks_stairs')) return dataVersion;
    if (palette.has('tuff_bricks_slab')) return dataVersion;
    if (palette.has('tuff_bricks_wall')) return dataVersion;
    if (palette.has('chiseled_tuff_bricks')) return dataVersion;

    dataVersion = 3463; //1.20
    if (palette.has('calibrated_sculk_sensor')) return dataVersion;
    if (palette.has('suspicious_gravel')) return dataVersion;
    if (palette.has('pitcher_plant')) return dataVersion;
    if (palette.has('sniffer_egg')) return dataVersion;

    dataVersion = 3337; //1.19.4
    if (palette.has('cherry_button')) return dataVersion;
    if (palette.has('cherry_door')) return dataVersion;
    if (palette.has('cherry_fence')) return dataVersion;
    if (palette.has('cherry_fence_gate')) return dataVersion;
    if (palette.has('cherry_hanging_sign')) return dataVersion;
    if (palette.has('cherry_leaves')) return dataVersion;
    if (palette.has('cherry_log')) return dataVersion;
    if (palette.has('cherry_planks')) return dataVersion;
    if (palette.has('cherry_pressure_plate')) return dataVersion;
    if (palette.has('cherry_sapling')) return dataVersion;
    if (palette.has('cherry_sign')) return dataVersion;
    if (palette.has('cherry_slab')) return dataVersion;
    if (palette.has('cherry_stairs')) return dataVersion;
    if (palette.has('cherry_trapdoor')) return dataVersion;
    if (palette.has('cherry_wall_hanging_sign')) return dataVersion;
    if (palette.has('cherry_wall_sign')) return dataVersion;
    if (palette.has('cherry_wood')) return dataVersion;
    if (palette.has('stripped_cherry_wood')) return dataVersion;
    if (palette.has('decorated_pot')) return dataVersion;
    if (palette.has('pink_petals')) return dataVersion;
    if (palette.has('suspicious_sand')) return dataVersion;
    if (palette.has('torchflower')) return dataVersion;

    dataVersion = 3128; //1.19.3
    if (palette.has('bamboo_button')) return dataVersion;
    if (palette.has('bamboo_door')) return dataVersion;
    if (palette.has('bamboo_fence')) return dataVersion;
    if (palette.has('bamboo_fence_gate')) return dataVersion;
    if (palette.has('bamboo_hanging_sign')) return dataVersion;
    if (palette.has('bamboo_mosaic')) return dataVersion;
    if (palette.has('bamboo_planks')) return dataVersion;
    if (palette.has('bamboo_pressure_plate')) return dataVersion;
    if (palette.has('bamboo_sign')) return dataVersion;
    if (palette.has('bamboo_slab')) return dataVersion;
    if (palette.has('bamboo_stairs')) return dataVersion;
    if (palette.has('bamboo_trapdoor')) return dataVersion;
    if (palette.has('bamboo_block')) return dataVersion;
    if (palette.has('stripped_bamboo_block')) return dataVersion;
    if (palette.has('chiseled_bookshelf')) return dataVersion;
    if (palette.has('oak_hanging_sign')) return dataVersion;
    if (palette.has('spruce_hanging_sign')) return dataVersion;
    if (palette.has('birch_hanging_sign')) return dataVersion;
    if (palette.has('jungle_hanging_sign')) return dataVersion;
    if (palette.has('acacia_hanging_sign')) return dataVersion;
    if (palette.has('dark_oak_hanging_sign')) return dataVersion;
    if (palette.has('mangrove_hanging_sign')) return dataVersion;
    if (palette.has('crimson_hanging_sign')) return dataVersion;
    if (palette.has('warped_hanging_sign')) return dataVersion;
    if (palette.has('piglin_head')) return dataVersion;
    if (palette.has('piglin_wall_head')) return dataVersion;

    //Default minimum is 1.19.2, I don't intend on going backwards than that for now
    return 3120;
}
