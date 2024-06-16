import { parseTxt } from '/js/schematics.js'

self.onmessage = function(e) {
    const name = e.data.name;
    const txt = e.data.txt;
    const echo = e.data.echo;

    try {
        const schematic = parseTxt(txt);
        this.postMessage({
            name: name,
            schematic: schematic,
            echo: echo
        });
    } catch (_) {
        this.postMessage({
            name: name,
            echo: echo
        });
    }
}
