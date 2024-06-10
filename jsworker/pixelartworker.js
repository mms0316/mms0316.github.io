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
    const ORIENTATION_VERTICAL = "0";
    const ORIENTATION_HORIZONTAL = "1";
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
    const orientation = data.orientation;
    const colorDiff = data.colorDiff;
    const dither = data.dither;
    const bgColor = culori.parse(data.bgColor);
    const transparentColor = data.transparentColor;
    const canvasHeight = data.canvasHeight;
    const canvasWidth = data.canvasWidth;
    const imageData = data.imageData;

    const canvasResult = new OffscreenCanvas(canvasWidth * 16, canvasHeight * 16);
    const canvasResultCtx = canvasResult.getContext("2d");

    //Palette
    const culoriPalette = {};

    let hasGlasses = false;
    let hasPalette = false;

    this.postMessage({
        progress : 'Loading palette...'
    });

    palettes.forEach(palette => {
        for (const pal of palette) {
            if (!pal.checked) continue;
            hasPalette = true;

            let color, block, img;
            if (typeof pal.color === 'string') {
                color = pal.color;
                block = pal.block;
                img = pal.img;
            }
            else {
                if (orientation === ORIENTATION_VERTICAL) {
                    color = pal.color[0];
                    block = pal.block[0];
                    img = pal.img[0];
                }
                else if (orientation === ORIENTATION_HORIZONTAL) {
                    color = pal.color[1];
                    block = pal.color[1];
                    img = pal.img[1];
                }
            }

            culoriPalette[culori.formatHex8(color)] = {
                img: img,
                block: [block]
            };

            //Glasses overlay
            for (const gl of glasses) {
                if (!gl.checked) continue;
                hasGlasses = true;

                const colorComposite = culori.blend([color, gl.color]);
                culoriPalette[culori.formatHex8(colorComposite)] = {
                    img: [img, gl.img],
                    block: [[block], [gl.block]],
                    composite: true
                };
            }
        }
    });

    if (!hasPalette) {
        this.postMessage(null);
        return;
    }

    //Add air as possibility
    if (transparentColor !== undefined) {
        culoriPalette[culori.formatHex8(transparentColor)] = {
            block: ['minecraft:air']
        };
    }

    //Dithering - memory optimization
    //When dithering, the line in question and at most 2 next lines are affected
    //Also * 3 for r / g / b
    let ditherExceeding;
   
    if (dither == DITHER_FLOYD_STEINBERG) {
        //Affects 2 lines at once
        ditherExceeding = new Float32Array(canvasWidth * 2 * 3);
    }

    //Color algorithm
    let diffAlgo;
    switch (colorDiff) {
        case COLORDIFF_CIE76:
            diffAlgo = differenceCie76Cached;
            break;
        case COLORDIFF_CIEDE2000:
            diffAlgo = differenceCiede2000Cached;
            break;
        case COLORDIFF_CUSTOM:
            diffAlgo = differenceCustomCached;
            break;
    }
    const nearestColors = culori.nearest(Object.keys(culoriPalette), diffAlgo);

    const nearestColorsCache = new Map();

    let schematic;
    if (orientation === ORIENTATION_VERTICAL) {
        schematic = {
            blocks: new Map(),
            xsize: canvasWidth,
            ysize: canvasHeight,
            zsize: 1
        }
        if (hasGlasses) {
            schematic.zsize = 3;
        }
    }
    else if (orientation == ORIENTATION_HORIZONTAL) {
        schematic = {
            blocks: new Map(),
            xsize: canvasWidth,
            ysize: 1,
            zsize: canvasHeight
        }
        if (hasGlasses) {
            schematic.ysize = 2;
        }
    }
    else {
        this.postMessage(null);
        return;
    }

    for (let y = 0; y < canvasHeight; y++) {
        this.postMessage({
            progress : 'Processing ' + Math.floor((y * 100) / canvasHeight) + '%'
        });

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
                const idx = x * 3;
                r = clampRGB(r + ditherExceeding[idx]);
                g = clampRGB(g + ditherExceeding[idx + 1]);
                b = clampRGB(b + ditherExceeding[idx + 2]);
            }
            
            const imgPixelColor = {mode: 'rgb', r: r, g: g, b: b, alpha: a};
            const processedPixelColor = culori.blend([bgColor, imgPixelColor]);

            let nearestColor;

            const cacheKey = culori.formatHex(processedPixelColor);
            nearestColor = nearestColorsCache.get(cacheKey);

            if (nearestColor === undefined) {
                nearestColor = nearestColors(processedPixelColor, 1)[0];
                nearestColorsCache.set(cacheKey, nearestColor);
            }
            if (nearestColor === undefined) {
                this.postMessage(null);
                return;
            }
            const data = culoriPalette[nearestColor];
            if (data.img === undefined) {
                canvasResultCtx.clearRect(x * 16, y * 16, 16, 16);
            }
            else {
                for (const img of [data.img].flat(1)) {
                    canvasResultCtx.drawImage(img, x * 16, y * 16, 16, 16);
                }
            }

            //Schematic
            if (orientation === ORIENTATION_VERTICAL) {
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
                        const key = xyzToKey(x, canvasHeight - y - 1, i, schematic.xsize, schematic.ysize, schematic.zsize);
                        schematic.blocks.set(key, blocks[i]);
                    }
                }
                else {
                    const key = xyzToKey(x, canvasHeight - y - 1, 0, schematic.xsize, schematic.ysize, schematic.zsize);
                    schematic.blocks.set(key, data.block);
                }
            }
            else if (orientation === ORIENTATION_HORIZONTAL){
                if (hasGlasses) {
                    let blocks;
    
                    if (data.composite) {
                        //Opaque block below, transparent block above
                        blocks = [data.block[0], data.block[1]];
                    }
                    else {
                        //Copy opaque blocks
                        blocks = [data.block, data.block];
                    }
    
                    for (let i = 0; i < blocks.length; i++) {
                        const key = xyzToKey(x, i, y, schematic.xsize, schematic.ysize, schematic.zsize);
                        schematic.blocks.set(key, blocks[i]);
                    }
                }
                else {
                    const key = xyzToKey(x, 0, y, schematic.xsize, schematic.ysize, schematic.zsize);
                    schematic.blocks.set(key, data.block);
                }
            }

            //Dithering
            if (dither === DITHER_NONE) continue;

            //Dithering - memory optimization
            if (x == canvasWidth - 1) {
                //Move a line up
                const line = canvasWidth * 3;
                ditherExceeding.copyWithin(0, line);
                ditherExceeding.fill(0, ditherExceeding.length - line);
            }

            const culoriNearestColor = culori.parse(nearestColor);

            if (dither === DITHER_FLOYD_STEINBERG) {
                const rdiff = processedPixelColor.r - culoriNearestColor.r;
                const gdiff = processedPixelColor.g - culoriNearestColor.g;
                const bdiff = processedPixelColor.b - culoriNearestColor.b;
                //x+1, y: 7/16
                if (x + 1 < canvasWidth) {
                    const idxDiffusion = (x + 1) * 3;
                    ditherExceeding[idxDiffusion    ] += rdiff * 7.0 / 16.0;
                    ditherExceeding[idxDiffusion + 1] += gdiff * 7.0 / 16.0;
                    ditherExceeding[idxDiffusion + 2] += bdiff * 7.0 / 16.0;
                }
                //x-1, y+1: 3/16
                if (x - 1 >= 0 && y + 1 < canvasHeight) {
                    const idxDiffusion = (canvasWidth + x - 1) * 3;
                    ditherExceeding[idxDiffusion    ] += rdiff * 3.0 / 16.0;
                    ditherExceeding[idxDiffusion + 1] += gdiff * 3.0 / 16.0;
                    ditherExceeding[idxDiffusion + 2] += bdiff * 3.0 / 16.0;
                }
                //x, y+1: 5/16
                if (y + 1 < canvasHeight) {
                    const idxDiffusion = (canvasWidth + x) * 3;
                    ditherExceeding[idxDiffusion    ] += rdiff * 5.0 / 16.0;
                    ditherExceeding[idxDiffusion + 1] += gdiff * 5.0 / 16.0;
                    ditherExceeding[idxDiffusion + 2] += bdiff * 5.0 / 16.0;
                }
                //x+1, y+1: 1/16
                if (x + 1 < canvasWidth && y + 1 < canvasHeight) {
                    const idxDiffusion = (canvasWidth + x + 1) * 3;
                    ditherExceeding[idxDiffusion    ] += rdiff / 16.0;
                    ditherExceeding[idxDiffusion + 1] += gdiff / 16.0;
                    ditherExceeding[idxDiffusion + 2] += bdiff / 16.0;
                }
            }
        }
    }

    const imageBitmap = canvasResult.transferToImageBitmap();
    this.postMessage({
        schematic: schematic,
        imageBitmap: imageBitmap
    }, [imageBitmap]);
}
function clampRGB(color) {
    if (color < 0) return +0.0;
    if (color > 1) return 1.0;
    return color;
}

function xyzToKey(x, y, z, xsize, ysize, zsize) {
    return (y * xsize * zsize) + z * xsize + x;
}

const cacheCie76Diff = new Map();
function differenceCie76Cached (std, smp) {
    const cacheKey = culori.formatHex(std) + culori.formatHex(smp); //This is a bit lossy, as r/g/b are clamped to 0-255
    const diff = cacheCie76Diff.get(cacheKey);
    if (diff !== undefined) return diff;

    const newDiff = culori.differenceCie76()(std, smp);
    try {
        cacheCie76Diff.set(cacheKey, newDiff);
    } catch (_) { }
    return newDiff;
};

const cacheCiede2000Diff = new Map();
function differenceCiede2000Cached (std, smp) {
    const cacheKey = culori.formatHex(std) + culori.formatHex(smp); //This is a bit lossy, as r/g/b are clamped to 0-255
    const diff = cacheCiede2000Diff.get(cacheKey);
    if (diff !== undefined) return diff;

    const newDiff = culori.differenceCiede2000()(std, smp);
    try {
        cacheCiede2000Diff.set(cacheKey, newDiff);
    } catch (_) { }
    return newDiff;
};


//It seems MapartCraft was based on a version before redstonehelper's v0.0.16, which fixed the color values
//This was supposed to be CIE76, but the values are wrong
function rgb2lab(rgb) {
    let r1 = rgb.r;
    let g1 = rgb.g;
    let b1 = rgb.b;

    r1 = 0.04045 >= r1 ? (r1 /= 12.0) : Math.pow((r1 + 0.055) / 1.055, 2.4);
    g1 = 0.04045 >= g1 ? (g1 /= 12.0) : Math.pow((g1 + 0.055) / 1.055, 2.4);
    b1 = 0.04045 >= b1 ? (b1 /= 12.0) : Math.pow((b1 + 0.055) / 1.055, 2.4);
    let f = (0.43605202 * r1 + 0.3850816 * g1 + 0.14308742 * b1) / 0.964221,
        h = 0.22249159 * r1 + 0.71688604 * g1 + 0.060621485 * b1,
        k = (0.013929122 * r1 + 0.097097 * g1 + 0.7141855 * b1) / 0.825211,
        l = 0.008856452 < h ? Math.pow(h, 1 / 3) : (903.2963 * h + 16.0) / 116.0,
        m = 500.0 * ((0.008856452 < f ? Math.pow(f, 1 / 3) : (903.2963 * f + 16.0) / 116.0) - l),
        n = 200.0 * (l - (0.008856452 < k ? Math.pow(k, 1 / 3) : (903.2963 * k + 16.0) / 116.0));

    return [2.55 * (116.0 * l - 16.0) + 0.5, m + 0.5, n + 0.5];
}
function squaredEuclideanMetricColours(std2, smp2) {
    const pixel1 = rgb2lab(std2);
    const pixel2 = rgb2lab(smp2);
    const r = pixel1[0] - pixel2[0];
    const g = pixel1[1] - pixel2[1];
    const b = pixel1[2] - pixel2[2];
    return r * r + g * g + b * b;
}

const cacheCustomDiff = new Map();
function differenceCustomCached (std, smp) {
    const cacheKey = culori.formatHex(std) + culori.formatHex(smp); //This is a bit lossy, as r/g/b are clamped to 0-255
    const diff = cacheCustomDiff.get(cacheKey);
    if (diff !== undefined) return diff;

    const rgb = culori.converter('rgb');
    const std2 = rgb(std);
    const smp2 = rgb(smp);

    const newDiff = squaredEuclideanMetricColours(std2, smp2);
    try {
        cacheCustomDiff.set(cacheKey, newDiff);
    } catch (e) { }
    return newDiff;
};
