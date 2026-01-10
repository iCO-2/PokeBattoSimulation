export const ITEMS_DEX = {
    "オボンののみ": {
        type: "berry",
        healType: "ratio", // 最大HPに対する割合
        threshold: 0.5,     // 発動しきい値 (HP 50%以下)
        value: 0.25,      // 回復量 (25%)
        message: "オボンののみで回復！"
    },
    "フィラのみ": {
        type: "berry",
        healType: "ratio",
        threshold: 0.25,    // 1/4以下
        value: 0.333,       // 1/3回復
        message: "フィラのみで回復！"
    },
    "イアのみ": {
        type: "berry",
        healType: "ratio",
        threshold: 0.25,
        value: 0.333,
        message: "イアのみで回復！"
    },
    "ウイのみ": {
        type: "berry",
        healType: "ratio",
        threshold: 0.25,
        value: 0.333,
        message: "ウイのみで回復！"
    },
    "マゴのみ": {
        type: "berry",
        healType: "ratio",
        threshold: 0.25,
        value: 0.333,
        message: "マゴのみで回復！"
    },
    "バンジのみ": {
        type: "berry",
        healType: "ratio",
        threshold: 0.25,
        value: 0.333,
        message: "バンジのみで回復！"
    },
    "たべのこし": {
        type: "passive",
        healType: "ratio",
        value: 0.0625,      // 1/16回復
        message: "たべのこしで回復"
    },
    "くろいヘドロ": {
        type: "passive",
        healType: "ratio",
        value: 0.0625,
        message: "くろいヘドロで回復"
    }
};
