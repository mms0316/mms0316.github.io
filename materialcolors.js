// Adapted from https://github.com/rebane2001/mapartcraft, which is GPLv3.0
/*
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
*/

const minecraft_color_vals = {
    //dark - normal - light
    UNDEFINED: [[0, 180, 0], [0, 220, 0], [0, 255, 0]],

    grass: [[89, 125, 39], [109, 153, 48], [127, 178, 56]],
    sand: [[174, 164, 115], [213, 201, 140], [247, 233, 163]],
    cobweb: [[140, 140, 140], [171, 171, 171], [199, 199, 199]],
    tnt: [[180, 0, 0], [220, 0, 0], [255, 0, 0]],
    ice: [[112, 112, 180], [138, 138, 220], [160, 160, 255]],
    iron: [[117, 117, 117], [144, 144, 144], [167, 167, 167]],
    leaves: [[0, 87, 0], [0, 106, 0], [0, 124, 0]],
    clay: [[115, 118, 129], [141, 144, 158], [164, 168, 184]],
    dirt: [[106, 76, 54], [130, 94, 66], [151, 109, 77]],
    stone: [[79, 79, 79], [96, 96, 96], [112, 112, 112]],
    water: [[45, 45, 180], [55, 55, 220], [64, 64, 255]],
    oak: [[100, 84, 50], [123, 102, 62], [143, 119, 72]],
    diorite: [[180, 177, 172], [220, 217, 211], [255, 252, 245]],

    white: [[180, 180, 180], [220, 220, 220], [255, 255, 255]],
    orange: [[152, 89, 36], [186, 109, 44], [216, 127, 51]],
    magenta: [[125, 53, 152], [153, 65, 186], [178, 76, 216]],
    light_blue: [[72, 108, 152], [88, 132, 186], [102, 153, 216]],
    yellow: [[161, 161, 36], [197, 197, 44], [229, 229, 51]],
    lime: [[89, 144, 17], [109, 176, 21], [127, 204, 25]],
    pink: [[170, 89, 116], [208, 109, 142], [242, 127, 165]],
    gray: [[53, 53, 53], [65, 65, 65], [76, 76, 76]],
    light_gray: [[108, 108, 108], [132, 132, 132], [153, 153, 153]],
    cyan: [[53, 89, 108], [65, 109, 132], [76, 127, 153]],
    purple: [[89, 44, 125], [109, 54, 153], [127, 63, 178]],
    blue: [[36, 53, 125], [44, 65, 153], [51, 76, 178]],
    brown: [[72, 53, 36], [88, 65, 44], [102, 76, 51]],
    green: [[72, 89, 36], [88, 109, 44], [102, 127, 51]],
    red: [[108, 36, 36], [132, 44, 44], [153, 51, 51]],
    black: [[17, 17, 17], [21, 21, 21], [25, 25, 25]],

    gold: [[176, 168, 54], [215, 205, 66], [250, 238, 77]],
    diamond: [[64, 154, 150], [79, 188, 183], [92, 219, 213]],
    lapis: [[52, 90, 180], [63, 110, 220], [74, 128, 255]],
    emerald: [[0, 153, 40], [0, 187, 50], [0, 217, 58]],

    spruce: [[91, 60, 34], [111, 74, 42], [129, 86, 49]],

    netherrack: [[79, 1, 0], [96, 1, 0], [112, 2, 0]],

    white_terracotta: [[147, 124, 113], [180, 152, 138], [209, 177, 161]],
    orange_terracotta: [[112, 57, 25], [137, 70, 31], [159, 82, 36]],
    magenta_terracotta: [[105, 61, 76], [128, 75, 93], [149, 87, 108]],
    light_blue_terracotta: [[79, 76, 97], [96, 93, 119], [112, 108, 138]],
    yellow_terracotta: [[131, 93, 25], [160, 114, 31], [186, 133, 36]],
    lime_terracotta: [[72, 82, 37], [88, 100, 45], [103, 117, 53]],
    pink_terracotta: [[112, 54, 55], [138, 66, 67], [160, 77, 78]],
    gray_terracotta: [[40, 28, 24], [49, 35, 30], [57, 41, 35]],
    light_gray_terracotta: [[95, 75, 69], [116, 92, 84], [135, 107, 98]],
    cyan_terracotta: [[61, 64, 64], [75, 79, 79], [87, 92, 92]],
    purple_terracotta: [[86, 51, 62], [105, 62, 75], [122, 73, 88]],
    blue_terracotta: [[53, 43, 64], [65, 53, 79], [76, 62, 92]],
    brown_terracotta: [[53, 35, 24], [65, 43, 30], [76, 50, 35]],
    green_terracotta: [[53, 57, 29], [65, 70, 36], [76, 82, 42]],
    red_terracotta: [[100, 42, 32], [122, 51, 39], [142, 60, 46]],
    black_terracotta: [[26, 15, 11], [31, 18, 13], [37, 22, 16]],

    crimson_nylium: [[133, 33, 34], [163, 41, 42], [189, 48, 49]],
    crimson_stem: [[104, 44, 68], [127, 54, 83], [148, 63, 97]],
    crimson_hyphae: [[64, 17, 20], [79, 21, 25], [92, 25, 29]],

    warped_nylium: [[15, 88, 94], [18, 108, 115], [22, 126, 134]],
    warped_stem: [[40, 100, 98], [50, 122, 120], [58, 142, 140]],
    warped_hyphae: [[60, 31, 43], [74, 37, 53], [86, 44, 62]],
    warped_wart_block: [[14, 127, 93], [17, 155, 114], [20, 180, 133]],

    deepslate: [[70, 70, 70], [86, 86, 86], [100, 100, 100]],

    raw_iron_block: [[152, 123, 103], [186, 150, 126], [216, 175, 147]],

    glow_lichen: [[89, 117, 105], [109, 144, 129], [127, 167, 150]],
}

export const MINECRAFT_COLORS = new Map([
    ['UNDEFINED', minecraft_color_vals.UNDEFINED],

    ['grass_block', minecraft_color_vals.grass],
    ['slime_block', minecraft_color_vals.grass],

    ['sand', minecraft_color_vals.sand],
    ['sandstone', minecraft_color_vals.sand],
    ['sandstone_slab', minecraft_color_vals.sand],
    ['birch_log[axis=y]', minecraft_color_vals.sand],
    ['birch_planks', minecraft_color_vals.sand],
    ['birch_slab', minecraft_color_vals.sand],
    ['glowstone', minecraft_color_vals.sand],
    ['end_stone', minecraft_color_vals.sand],
    ['end_stone_bricks', minecraft_color_vals.sand],
    ['end_stone_brick_slab', minecraft_color_vals.sand],
    ['bone_block', minecraft_color_vals.sand],

    ['cobweb', minecraft_color_vals.cobweb],
    ['mushroom_stem', minecraft_color_vals.cobweb],

    ['tnt', minecraft_color_vals.tnt],
    ['redstone_block', minecraft_color_vals.tnt],

    ['ice', minecraft_color_vals.ice],
    ['packed_ice', minecraft_color_vals.ice],
    ['blue_ice', minecraft_color_vals.ice],

    ['iron_block', minecraft_color_vals.iron],
    ['iron_trapdoor', minecraft_color_vals.iron],
    ['iron_bars', minecraft_color_vals.iron],
    ['heavy_weighted_pressure_plate', minecraft_color_vals.iron],
    ['brewing_stand', minecraft_color_vals.iron],

    ['oak_leaves', minecraft_color_vals.leaves],
    ['spruce_leaves', minecraft_color_vals.leaves],
    ['birch_leaves', minecraft_color_vals.leaves],
    ['jungle_leaves', minecraft_color_vals.leaves],
    ['acacia_leaves', minecraft_color_vals.leaves],
    ['dark_oak_leaves', minecraft_color_vals.leaves],
    ['azalea_leaves', minecraft_color_vals.leaves],

    ['clay', minecraft_color_vals.clay],

    ['jungle_log[axis=y]', minecraft_color_vals.dirt],
    ['jungle_planks', minecraft_color_vals.dirt],
    ['jungle_slab', minecraft_color_vals.dirt],
    ['dirt', minecraft_color_vals.dirt],
    ['coarse_dirt', minecraft_color_vals.dirt],
    ['rooted_dirt', minecraft_color_vals.dirt],
    ['jukebox', minecraft_color_vals.dirt],
    ['granite', minecraft_color_vals.dirt],
    ['granite_slab', minecraft_color_vals.dirt],

    ['cobblestone', minecraft_color_vals.stone],
    ['cobblestone_slab', minecraft_color_vals.stone],
    ['mossy_cobblestone', minecraft_color_vals.stone],
    ['mossy_cobblestone_slab', minecraft_color_vals.stone],
    ['stone', minecraft_color_vals.stone],
    ['stone_slab', minecraft_color_vals.stone],
    ['smooth_stone_slab', minecraft_color_vals.stone],
    ['stone_bricks', minecraft_color_vals.stone],
    ['stone_brick_slab', minecraft_color_vals.stone],
    ['andesite', minecraft_color_vals.stone],
    ['andesite_slab', minecraft_color_vals.stone],
    ['bedrock', minecraft_color_vals.stone],
    ['acacia_log[axis=x]', minecraft_color_vals.stone],
    ['gravel', minecraft_color_vals.stone],

    ['water', minecraft_color_vals.water],

    ['oak_log[axis=y]', minecraft_color_vals.oak],
    ['oak_planks', minecraft_color_vals.oak],
    ['oak_slab', minecraft_color_vals.oak],
    ['crafting_table', minecraft_color_vals.oak],

    ['birch_log[axis=x]', minecraft_color_vals.diorite],
    ['diorite', minecraft_color_vals.diorite],
    ['diorite_slab', minecraft_color_vals.diorite],
    ['quartz_block', minecraft_color_vals.diorite],
    ['quartz_slab', minecraft_color_vals.diorite],
    ['sea_lantern', minecraft_color_vals.diorite],

    ['white_wool', minecraft_color_vals.white],
    ['white_carpet', minecraft_color_vals.white],
    ['white_stained_glass', minecraft_color_vals.white],
    ['white_concrete', minecraft_color_vals.white],
    ['white_concrete_powder', minecraft_color_vals.white],
    ['white_glazed_terracotta', minecraft_color_vals.white],
    ['snow_block', minecraft_color_vals.white],
    ['snow', minecraft_color_vals.white],

    ['orange_wool', minecraft_color_vals.orange],
    ['orange_carpet', minecraft_color_vals.orange],
    ['orange_stained_glass', minecraft_color_vals.orange],
    ['orange_concrete', minecraft_color_vals.orange],
    ['orange_concrete_powder', minecraft_color_vals.orange],
    ['orange_glazed_terracotta', minecraft_color_vals.orange],
    ['pumpkin', minecraft_color_vals.orange],
    ['acacia_log[axis=y]', minecraft_color_vals.orange],
    ['acacia_planks', minecraft_color_vals.orange],
    ['acacia_slab', minecraft_color_vals.orange],
    ['red_sand', minecraft_color_vals.orange],
    ['red_sandstone', minecraft_color_vals.orange],
    ['red_sandstone_slab', minecraft_color_vals.orange],
    ['terracotta', minecraft_color_vals.orange],
    ['honey_block', minecraft_color_vals.orange],
    ['honeycomb_block', minecraft_color_vals.orange],
    ['raw_copper_block', minecraft_color_vals.orange],
    ['waxed_copper_block', minecraft_color_vals.orange],
    ['waxed_cut_copper_slab', minecraft_color_vals.orange],

    ['magenta_wool', minecraft_color_vals.magenta],
    ['magenta_carpet', minecraft_color_vals.magenta],
    ['magenta_stained_glass', minecraft_color_vals.magenta],
    ['magenta_concrete', minecraft_color_vals.magenta],
    ['magenta_concrete_powder', minecraft_color_vals.magenta],
    ['magenta_glazed_terracotta', minecraft_color_vals.magenta],
    ['purpur_block', minecraft_color_vals.magenta],
    ['purpur_slab', minecraft_color_vals.magenta],

    ['light_blue_wool', minecraft_color_vals.light_blue],
    ['light_blue_carpet', minecraft_color_vals.light_blue],
    ['light_blue_stained_glass', minecraft_color_vals.light_blue],
    ['light_blue_concrete', minecraft_color_vals.light_blue],
    ['light_blue_concrete_powder', minecraft_color_vals.light_blue],
    ['light_blue_glazed_terracotta', minecraft_color_vals.light_blue],

    ['yellow_wool', minecraft_color_vals.yellow],
    ['yellow_carpet', minecraft_color_vals.yellow],
    ['yellow_stained_glass', minecraft_color_vals.yellow],
    ['yellow_concrete', minecraft_color_vals.yellow],
    ['yellow_concrete_powder', minecraft_color_vals.yellow],
    ['yellow_glazed_terracotta', minecraft_color_vals.yellow],
    ['hay_block', minecraft_color_vals.yellow],
    ['sponge', minecraft_color_vals.yellow],

    ['lime_wool', minecraft_color_vals.lime],
    ['lime_carpet', minecraft_color_vals.lime],
    ['lime_stained_glass', minecraft_color_vals.lime],
    ['lime_concrete', minecraft_color_vals.lime],
    ['lime_concrete_powder', minecraft_color_vals.lime],
    ['lime_glazed_terracotta', minecraft_color_vals.lime],
    ['melon', minecraft_color_vals.lime],

    ['pink_wool', minecraft_color_vals.pink],
    ['pink_carpet', minecraft_color_vals.pink],
    ['pink_stained_glass', minecraft_color_vals.pink],
    ['pink_concrete', minecraft_color_vals.pink],
    ['pink_concrete_powder', minecraft_color_vals.pink],
    ['pink_glazed_terracotta', minecraft_color_vals.pink],

    ['gray_wool', minecraft_color_vals.gray],
    ['gray_carpet', minecraft_color_vals.gray],
    ['gray_stained_glass', minecraft_color_vals.gray],
    ['gray_concrete', minecraft_color_vals.gray],
    ['gray_concrete_powder', minecraft_color_vals.gray],
    ['gray_glazed_terracotta', minecraft_color_vals.gray],
    ['dead_tube_coral_block', minecraft_color_vals.gray],
    ['dead_brain_coral_block', minecraft_color_vals.gray],
    ['dead_bubble_coral_block', minecraft_color_vals.gray],
    ['dead_fire_coral_block', minecraft_color_vals.gray],
    ['dead_horn_coral_block', minecraft_color_vals.gray],
    ['tinted_glass', minecraft_color_vals.gray],

    ['light_gray_wool', minecraft_color_vals.light_gray],
    ['light_gray_carpet', minecraft_color_vals.light_gray],
    ['light_gray_stained_glass', minecraft_color_vals.light_gray],
    ['light_gray_concrete', minecraft_color_vals.light_gray],
    ['light_gray_concrete_powder', minecraft_color_vals.light_gray],
    ['light_gray_glazed_terracotta', minecraft_color_vals.light_gray],

    ['cyan_wool', minecraft_color_vals.cyan],
    ['cyan_carpet', minecraft_color_vals.cyan],
    ['cyan_stained_glass', minecraft_color_vals.cyan],
    ['cyan_concrete', minecraft_color_vals.cyan],
    ['cyan_concrete_powder', minecraft_color_vals.cyan],
    ['cyan_glazed_terracotta', minecraft_color_vals.cyan],
    ['prismarine', minecraft_color_vals.cyan],
    ['prismarine_slab', minecraft_color_vals.cyan],

    ['purple_wool', minecraft_color_vals.purple],
    ['purple_carpet', minecraft_color_vals.purple],
    ['purple_stained_glass', minecraft_color_vals.purple],
    ['purple_concrete', minecraft_color_vals.purple],
    ['purple_concrete_powder', minecraft_color_vals.purple],
    ['purple_glazed_terracotta', minecraft_color_vals.purple],
    ['mycelium', minecraft_color_vals.purple],
    ['amethyst_block', minecraft_color_vals.purple],

    ['blue_wool', minecraft_color_vals.blue],
    ['blue_carpet', minecraft_color_vals.blue],
    ['blue_stained_glass', minecraft_color_vals.blue],
    ['blue_concrete', minecraft_color_vals.blue],
    ['blue_concrete_powder', minecraft_color_vals.blue],
    ['blue_glazed_terracotta', minecraft_color_vals.blue],

    ['brown_wool', minecraft_color_vals.brown],
    ['brown_carpet', minecraft_color_vals.brown],
    ['brown_stained_glass', minecraft_color_vals.brown],
    ['brown_concrete', minecraft_color_vals.brown],
    ['brown_concrete_powder', minecraft_color_vals.brown],
    ['brown_glazed_terracotta', minecraft_color_vals.brown],
    ['dark_oak_log[axis=y]', minecraft_color_vals.brown],
    ['dark_oak_planks', minecraft_color_vals.brown],
    ['dark_oak_slab', minecraft_color_vals.brown],
    ['spruce_log[axis=x]', minecraft_color_vals.brown],
    ['soul_sand', minecraft_color_vals.brown],
    ['soul_soil', minecraft_color_vals.brown],

    ['green_wool', minecraft_color_vals.green],
    ['green_carpet', minecraft_color_vals.green],
    ['green_stained_glass', minecraft_color_vals.green],
    ['green_concrete', minecraft_color_vals.green],
    ['green_concrete_powder', minecraft_color_vals.green],
    ['green_glazed_terracotta', minecraft_color_vals.green],
    ['dried_kelp_block', minecraft_color_vals.green],

    ['red_wool', minecraft_color_vals.red],
    ['red_carpet', minecraft_color_vals.red],
    ['red_stained_glass', minecraft_color_vals.red],
    ['red_concrete', minecraft_color_vals.red],
    ['red_concrete_powder', minecraft_color_vals.red],
    ['red_glazed_terracotta', minecraft_color_vals.red],
    ['bricks', minecraft_color_vals.red],
    ['brick_slab', minecraft_color_vals.red],
    ['nether_wart_block', minecraft_color_vals.red],
    ['shroomlight', minecraft_color_vals.red],

    ['black_wool', minecraft_color_vals.black],
    ['black_carpet', minecraft_color_vals.black],
    ['black_stained_glass', minecraft_color_vals.black],
    ['black_concrete', minecraft_color_vals.black],
    ['black_concrete_powder', minecraft_color_vals.black],
    ['black_glazed_terracotta', minecraft_color_vals.black],
    ['coal_block', minecraft_color_vals.black],
    ['obsidian', minecraft_color_vals.black],
    ['crying_obsidian', minecraft_color_vals.black],
    ['blackstone', minecraft_color_vals.black],
    ['blackstone_slab', minecraft_color_vals.black],
    ['basalt', minecraft_color_vals.black],
    ['netherite_block', minecraft_color_vals.black],

    ['gold_block', minecraft_color_vals.gold],
    ['light_weighted_pressure_plate', minecraft_color_vals.gold],
    ['raw_gold_block', minecraft_color_vals.gold],

    ['diamond_block', minecraft_color_vals.diamond],
    ['prismarine_bricks', minecraft_color_vals.diamond],
    ['prismarine_brick_slab', minecraft_color_vals.diamond],
    ['dark_prismarine', minecraft_color_vals.diamond],
    ['dark_prismarine_slab', minecraft_color_vals.diamond],
    ['beacon', minecraft_color_vals.diamond],

    ['lapis_block', minecraft_color_vals.lapis],

    ['emerald_block', minecraft_color_vals.emerald],

    ['spruce_log[axis=y]', minecraft_color_vals.spruce],
    ['spruce_planks', minecraft_color_vals.spruce],
    ['spruce_slab', minecraft_color_vals.spruce],
    ['oak_log[axis=x]', minecraft_color_vals.spruce],
    ['jungle_log[axis=x]', minecraft_color_vals.spruce],
    ['podzol', minecraft_color_vals.spruce],

    ['netherrack', minecraft_color_vals.netherrack],
    ['nether_bricks', minecraft_color_vals.netherrack],
    ['nether_brick_slab', minecraft_color_vals.netherrack],
    ['magma_block', minecraft_color_vals.netherrack],
    ['red_nether_bricks', minecraft_color_vals.netherrack],
    ['red_nether_brick_slab', minecraft_color_vals.netherrack],

    ['white_terracotta', minecraft_color_vals.white_terracotta],
    ['calcite', minecraft_color_vals.white_terracotta],

    ['orange_terracotta', minecraft_color_vals.orange_terracotta],
    ['magenta_terracotta', minecraft_color_vals.magenta_terracotta],
    ['light_blue_terracotta', minecraft_color_vals.light_blue_terracotta],
    ['yellow_terracotta', minecraft_color_vals.yellow_terracotta],
    ['lime_terracotta', minecraft_color_vals.lime_terracotta],
    ['pink_terracotta', minecraft_color_vals.pink_terracotta],

    ['gray_terracotta', minecraft_color_vals.gray_terracotta],
    ['tuff', minecraft_color_vals.gray_terracotta],

    ['light_gray_terracotta', minecraft_color_vals.light_gray_terracotta],
    ['waxed_exposed_copper', minecraft_color_vals.light_gray_terracotta],
    ['waxed_exposed_cut_copper_slab', minecraft_color_vals.light_gray_terracotta],

    ['cyan_terracotta', minecraft_color_vals.cyan_terracotta],
    ['purple_terracotta', minecraft_color_vals.purple_terracotta],
    ['blue_terracotta', minecraft_color_vals.blue_terracotta],

    ['brown_terracotta', minecraft_color_vals.brown_terracotta],
    ['dripstone_block', minecraft_color_vals.brown_terracotta],

    ['green_terracotta', minecraft_color_vals.green_terracotta],
    ['red_terracotta', minecraft_color_vals.red_terracotta],
    ['black_terracotta', minecraft_color_vals.black_terracotta],

    ['crimson_nylium', minecraft_color_vals.crimson_nylium],

    ['crimson_stem', minecraft_color_vals.crimson_stem],
    ['stripped_crimson_stem', minecraft_color_vals.crimson_stem],
    ['crimson_planks', minecraft_color_vals.crimson_stem],
    ['crimson_slab', minecraft_color_vals.crimson_stem],

    ['crimson_hyphae', minecraft_color_vals.crimson_hyphae],
    ['stripped_crimson_hyphae', minecraft_color_vals.crimson_hyphae],

    ['warped_nylium', minecraft_color_vals.warped_nylium],
    ['waxed_oxidized_copper', minecraft_color_vals.warped_nylium],
    ['waxed_oxidized_cut_copper_slab', minecraft_color_vals.warped_nylium],

    ['warped_stem', minecraft_color_vals.warped_stem],
    ['stripped_warped_stem', minecraft_color_vals.warped_stem],
    ['warped_planks', minecraft_color_vals.warped_stem],
    ['warped_slab', minecraft_color_vals.warped_stem],
    ['waxed_weathered_copper', minecraft_color_vals.warped_stem],
    ['waxed_weathered_cut_copper_slab', minecraft_color_vals.warped_stem],

    ['warped_hyphae', minecraft_color_vals.warped_hyphae],
    ['stripped_warped_hyphae', minecraft_color_vals.warped_hyphae],

    ['warped_wart_block', minecraft_color_vals.warped_wart_block],

    ['deepslate', minecraft_color_vals.deepslate],
    ['cobbled_deepslate', minecraft_color_vals.deepslate],
    ['cobbled_deepslate_slab', minecraft_color_vals.deepslate],

    ['raw_iron_block', minecraft_color_vals.raw_iron_block],

    ['glow_lichen', minecraft_color_vals.glow_lichen],

]);
