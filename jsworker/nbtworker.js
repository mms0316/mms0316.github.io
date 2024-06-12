/*
This webpage uses Prismarine NBT (https://github.com/PrismarineJS/prismarine-nbt)
*/

importScripts('/pnbt.js');

const nbt = require('prismarine-nbt');
const { Buffer } = require('buffer');

self.onmessage = function(e) {
    const name = e.data.name;
    const contents = e.data.contents;
    
    nbt.parse(Buffer.from(contents))
    .then(nbt =>
        this.postMessage({
            name: name,
            nbt: nbt
        }))
    .catch(() =>
        this.postMessage({
            name: name,
            nbt: null
        }));
}
