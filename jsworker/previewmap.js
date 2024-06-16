import { calculateMaxHeights, calculateBlockData } from '/js/mapcolor.js';
import { convertToTxt } from '/js/schematics.js';

self.onmessage = function(e) {
    const name = e.data.name;
    const schematic = e.data.schematic;
    const order = e.data.order;

    try {
        const maxHeights = calculateMaxHeights(schematic);
        const [blockData, palette] = calculateBlockData(schematic, maxHeights);

        //image data
        const offscreenCanvas = new OffscreenCanvas(schematic.xsize, schematic.zsize);
        const offscreenContext = offscreenCanvas.getContext('2d');

        for (const el of blockData) {
            const [x, _, z] = el.coords;

            offscreenContext.fillStyle = colorArrayToString(el.color);
            offscreenContext.fillRect(x, z, 1, 1);
        }
        const imageData = offscreenContext.getImageData(0, 0, schematic.xsize, schematic.zsize);

        // material list
        const materialList = palette.map((el) => `${el[0]} = ${el[1]}`).join('<br>');

        // text data
        const textData = convertToTxt(schematic);

        this.postMessage({
            name: name,
            imageData: imageData,
            materialList: materialList,
            textData: textData,
            order: order
        });
    } catch (_) {
        this.postMessage({
            order: order
        });
    }
}

function colorArrayToString(array) {
    return `rgb(${array[0]}, ${array[1]}, ${array[2]})`;
}
