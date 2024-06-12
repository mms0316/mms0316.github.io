import { MapArtSchematic } from '/js/mapartschematic.js'

self.onmessage = function(e) {
    const name = e.data.name;
    const schematic = e.data.schematic;
    const echo = e.data.echo;

    try {
        const mapart = new MapArtSchematic(schematic);
        mapart.load();

        this.postMessage({
            name: name,
            mapart: mapart,
            echo: echo
        });
    } catch (_) {
        this.postMessage({
            name: name,
            mapart: null,
            echo: echo
        });
    }
}
