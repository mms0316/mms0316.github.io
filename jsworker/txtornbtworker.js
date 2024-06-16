/*
This webpage uses Prismarine NBT (https://github.com/PrismarineJS/prismarine-nbt)
*/

importScripts('/pnbt.js');

const nbt = require('prismarine-nbt');
const { Buffer } = require('buffer');

self.onmessage = function(e) {
    const name = e.data.name;
    const contents = Buffer.from(e.data.contents);
    const echo = e.data.echo;

    const firstByte = contents[0];
    if (firstByte == 0x2D ||
        (firstByte >= 0x30 && firstByte <= 0x39)) {

        const payload = parseTxt(new TextDecoder().decode(contents));
        this.postMessage({
            name: name,
            txt: payload,
            echo: echo
        });
    }
    else {
        nbt.parse(contents)
        .then(nbt =>
            this.postMessage({
                name: name,
                nbt: nbt,
                echo: echo
            }))
        .catch(() =>
            this.postMessage({
                name: name,
                echo: echo
            }));
    }
}

//Custom .txt format with lines such as: X Y Z minecraft:material[prop1=val1,prop2=val2]
function parseTxt(txt) {
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
