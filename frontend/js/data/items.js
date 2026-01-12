export const ITEMS_DEX = {
    "オボンののみ": {
        type: "berry",
        healType: "ratio", // 最大HPに対する割合
        threshold: 0.5,     // 発動しきい値 (HP 50%以下)
        value: 0.25,      // 回復量 (25%)
        message: "オボンののみで回復！"
    },
    "回復実": {
        type: "berry",
        healType: "ratio",
        threshold: 0.25,    // 1/4以下
        value: 0.333,       // 1/3回復
        message: "回復実で回復！"
    },
    "たべのこし": {
        type: "passive",
        healType: "ratio",
        value: 0.0625,      // 1/16回復
        message: "たべのこしで回復"
    },
    "こだわりハチマキ": {
        type: "stat_modifier",
        message: "こだわりハチマキで攻撃アップ"
    },
    "いのちのたま": {
        type: "damage_boost",
        message: "いのちのたまで威力アップ"
    },
    "くろいヘドロ": {
        type: "passive",
        healType: "ratio",
        value: 0.0625,
        message: "くろいヘドロで回復"
    }
};
