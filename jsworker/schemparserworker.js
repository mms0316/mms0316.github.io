import { parseMinecraftSchematic } from '/js/schematics.js'

self.onmessage = function(e) {
    const name = e.data.name;
    const nbt = e.data.nbt;

    try {
        const schematic = parseMinecraftSchematic(nbt, name);
        this.postMessage({
            name: name,
            schematic: schematic
        });
    } catch (_) {
        this.postMessage({
            name: name,
            schematic: null
        });
    }
}
