/*
This script uses culori (https://github.com/Evercoder/culori) and
portion of rebane's MapartCraft's (https://github.com/rebane2001/mapartcraft) ported version of redstonehelper's Mapconverter (https://github.com/redstonehelper/MapConverter)

culori is licensed as:
MIT License

Copyright (c) 2018 Dan Burzo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.


MapartCraft is licensed as GPLv3.0:

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

Pako is licensed as:
The MIT License

Copyright (C) 2014-2017 by Vitaly Puzrin and Andrei Tuputcyn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
*/

importScripts("/culori.min.js");

self.onmessage = function(e) {
    const DITHER_NONE = "0";
    const DITHER_FLOYD_STEINBERG = "1";
    const COLORDIFF_CIE76 = "0";
    const COLORDIFF_CIEDE2000 = "1";
    //Similar to rebane's MapartCraft port of redstonehelper's MapConverter
    //it seems MapartCraft was based on a version before redstonehelper's v0.0.16, which fixed the color values
    const COLORDIFF_CUSTOM = "C";

    const data = e.data;

    const palettes = data.palettes;
    const glasses = data.glasses;
    const colorDiff = data.colorDiff;
    const dither = data.dither;
    const canvasHeight = data.canvasHeight;
    const canvasWidth = data.canvasWidth;
    const imageData = data.imageData;

    const canvasResult = new OffscreenCanvas(canvasWidth * 16, canvasHeight * 16);
    const canvasResultCtx = canvasResult.getContext("2d");

    //Palette
    const culoriPalette = {};

    let hasGlasses = false;
    let hasPalette = false;

    palettes.forEach(palette => {
        for (const pal of palette) {
            if (!pal.checked) continue;
            hasPalette = true;
            culoriPalette[pal.color] = {
                img: pal.img,
                block: [pal.block]
            };

            //Glasses overlay
            for (const gl of glasses) {
                if (!gl.checked) continue;
                hasGlasses = true;

                const colorComposite = colorOverColor(culori.parse(gl.color), culori.parse(pal.color));
                culoriPalette[culori.formatHex8(colorComposite)] = {
                    img: [pal.img, gl.img],
                    block: [[pal.block], [gl.block]],
                    composite: true
                };
            }
        }
    });

    if (!hasPalette) {
        this.postMessage(null);
        return;
    }

    const ditherExceedingRed = new Float32Array(canvasHeight * canvasWidth);
    const ditherExceedingGreen = new Float32Array(canvasHeight * canvasWidth);
    const ditherExceedingBlue = new Float32Array(canvasHeight * canvasWidth);

    //Color algorithm
    let diffAlgo;
    switch (colorDiff) {
        case COLORDIFF_CIE76:
            diffAlgo = culori.differenceCie76();
            break;
        case COLORDIFF_CIEDE2000:
            diffAlgo = culori.differenceCiede2000();
            break;
        case COLORDIFF_CUSTOM:
            diffAlgo = (std, smp) => {
                const rgb = culori.converter('rgb');

                const std2 = rgb(std);
                const smp2 = rgb(smp);

                const pixel1 = [std2.r * 255.0, std2.g * 255.0, std2.b * 255.0];
                const pixel2 = [smp2.r * 255.0, smp2.g * 255.0, smp2.b * 255.0];

                return squaredEuclideanMetricColours(pixel1, pixel2);
            };
            break;
    }
    const nearestColors = culori.nearest(Object.keys(culoriPalette), diffAlgo);

    //Schematic (vertical)
    const schematicVertical = {
        blocks: new Map(),
        xsize: canvasWidth,
        ysize: canvasHeight,
        zsize: 1
    }
    if (hasGlasses) {
        schematicVertical.zsize = 3;
    }

    for (let y = 0; y < canvasHeight; y++) {
        for (let x = 0; x < canvasWidth; x++) {
            const imgDataIdx = (y * canvasWidth + x) * 4;
            let r = imageData.data[imgDataIdx];
            let g = imageData.data[imgDataIdx + 1];
            let b = imageData.data[imgDataIdx + 2];
            let a = imageData.data[imgDataIdx + 3];

            r /= 255.0;
            g /= 255.0;
            b /= 255.0;
            a /= 255.0;

            if (dither !== DITHER_NONE) {
                const idx = y * canvasWidth + x;

                r = clampRGB(r + ditherExceedingRed[idx]);
                g = clampRGB(g + ditherExceedingGreen[idx]);
                b = clampRGB(b + ditherExceedingBlue[idx]);
            }
            
            const culoriColor = {mode: 'rgb', r: r, g: g, b: b, alpha: a};
            const nearestColor = nearestColors(culoriColor, 1)[0];
            if (nearestColor === undefined) {
                this.postMessage(null);
                return;
            }
            const data = culoriPalette[nearestColor];

            for (const img of [data.img].flat(1)) {
                canvasResultCtx.drawImage(img, x * 16, y * 16, 16, 16);
            }

            //Schematic
            if (hasGlasses) {
                let blocks;

                if (data.composite) {
                    //If this block is glasses, mirrors first and last block
                    blocks = [data.block[1], data.block[0], data.block[1]];
                }
                else {
                    //Otherwise, first, second and third block will be the same block
                    blocks = [data.block, data.block, data.block];
                }

                for (let i = 0; i < blocks.length; i++) {
                    const key = xyzToKey(x, canvasHeight - y - 1, i, schematicVertical.xsize, schematicVertical.ysize, schematicVertical.zsize);
                    schematicVertical.blocks.set(key, blocks[i]);
                }
            }
            else {
                const key = xyzToKey(x, canvasHeight - y - 1, 0, schematicVertical.xsize, schematicVertical.ysize, schematicVertical.zsize);
                schematicVertical.blocks.set(key, data.block);
            }

            //Dithering
            if (dither === DITHER_NONE) continue;

            const culoriNearestColor = culori.parse(nearestColor);

            if (dither === DITHER_FLOYD_STEINBERG) {
                const rdiff = culoriColor.r - culoriNearestColor.r;
                const gdiff = culoriColor.g - culoriNearestColor.g;
                const bdiff = culoriColor.b - culoriNearestColor.b;
                //x+1, y: 7/16
                if (x + 1 < canvasWidth) {
                    const idxDiffusion = y * canvasHeight + x + 1;
                    ditherExceedingRed[idxDiffusion] += rdiff * 7.0 / 16.0;
                    ditherExceedingGreen[idxDiffusion] += gdiff * 7.0 / 16.0;
                    ditherExceedingBlue[idxDiffusion] += bdiff * 7.0 / 16.0;
                }
                //x-1, y+1: 3/16
                if (x - 1 >= 0 && y + 1 < canvasHeight) {
                    const idxDiffusion = (y + 1) * canvasHeight + x - 1;
                    ditherExceedingRed[idxDiffusion] += rdiff * 3.0 / 16.0;
                    ditherExceedingGreen[idxDiffusion] += gdiff * 3.0 / 16.0;
                    ditherExceedingBlue[idxDiffusion] += bdiff * 3.0 / 16.0;
                }
                //x, y+1: 5/16
                if (y + 1 < canvasHeight) {
                    const idxDiffusion = (y + 1) * canvasHeight + x;
                    ditherExceedingRed[idxDiffusion] += rdiff * 5.0 / 16.0;
                    ditherExceedingGreen[idxDiffusion] += gdiff * 5.0 / 16.0;
                    ditherExceedingBlue[idxDiffusion] += bdiff * 5.0 / 16.0;
                }
                //x+1, y+1: 1/16
                if (x + 1 < canvasWidth && y + 1 < canvasHeight) {
                    const idxDiffusion = (y + 1) * canvasHeight + x + 1;
                    ditherExceedingRed[idxDiffusion] += rdiff / 16.0;
                    ditherExceedingGreen[idxDiffusion] += gdiff / 16.0;
                    ditherExceedingBlue[idxDiffusion] += bdiff / 16.0;
                }
            }
        }
    }

    this.postMessage({
        schematicVertical: schematicVertical,
        imageBitmap: canvasResult.transferToImageBitmap()
    });
}
function clampRGB(color) {
    if (color < 0) return +0.0;
    if (color > 1) return 1.0;
    return color;
}

//It seems MapartCraft was based on a version before redstonehelper's v0.0.16, which fixed the color values
//This was supposed to be CIE76, but the values are wrong
function rgb2lab(rgb) {
    let r1 = rgb[0] / 255.0;
    let g1 = rgb[1] / 255.0;
    let b1 = rgb[2] / 255.0;

    r1 = 0.04045 >= r1 ? (r1 /= 12.0) : Math.pow((r1 + 0.055) / 1.055, 2.4);
    g1 = 0.04045 >= g1 ? (g1 /= 12.0) : Math.pow((g1 + 0.055) / 1.055, 2.4);
    b1 = 0.04045 >= b1 ? (b1 /= 12.0) : Math.pow((b1 + 0.055) / 1.055, 2.4);
    let f = (0.43605202 * r1 + 0.3850816 * g1 + 0.14308742 * b1) / 0.964221,
        h = 0.22249159 * r1 + 0.71688604 * g1 + 0.060621485 * b1,
        k = (0.013929122 * r1 + 0.097097 * g1 + 0.7141855 * b1) / 0.825211,
        l = 0.008856452 < h ? Math.pow(h, 1 / 3) : (903.2963 * h + 16.0) / 116.0,
        m = 500.0 * ((0.008856452 < f ? Math.pow(f, 1 / 3) : (903.2963 * f + 16.0) / 116.0) - l),
        n = 200.0 * (l - (0.008856452 < k ? Math.pow(k, 1 / 3) : (903.2963 * k + 16.0) / 116.0));

    rgb = [2.55 * (116.0 * l - 16.0) + 0.5, m + 0.5, n + 0.5];
    return rgb;
}
function squaredEuclideanMetricColours(pixel1, pixel2) {
    pixel1 = rgb2lab(pixel1);
    pixel2 = rgb2lab(pixel2);
    const r = pixel1[0] - pixel2[0];
    const g = pixel1[1] - pixel2[1];
    const b = pixel1[2] - pixel2[2];
    return r * r + g * g + b * b;
}

function colorOverColor(colorAbove, colorBelow) {
    const colorComposite = {mode: 'rgb'};

    const factor = colorBelow.alpha * (1 - colorAbove.alpha);
    colorComposite.alpha = colorAbove.alpha + factor;
    for (const part of ['r', 'g', 'b']) {
        colorComposite[part] = (colorAbove[part] * colorAbove.alpha + colorBelow[part] * factor) / colorComposite.alpha;
    }
    
    return colorComposite;
}

function xyzToKey(x, y, z, xsize, ysize, zsize) {
    return (y * xsize * zsize) + z * xsize + x;
}
