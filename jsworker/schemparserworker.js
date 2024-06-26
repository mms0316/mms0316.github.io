import { parseMinecraftSchematic } from '/js/schematics.js'

self.onmessage = function(e) {
    const name = e.data.name;
    const nbt = e.data.nbt;
    const echo = e.data.echo;

    try {
        const schematic = parseMinecraftSchematic(nbt, name);
        this.postMessage({
            name: name,
            schematic: schematic,
            echo: echo
        });
    } catch (_) {
        this.postMessage({
            name: name,
            schematic: null,
            echo: echo
        });
    }
}
