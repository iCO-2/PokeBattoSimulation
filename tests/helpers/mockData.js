// テスト用モックデータ

export const MOCK_ITEMS_DEX = {
    'こだわりハチマキ': {
        type: 'stat_modifier',
        effect_target: ['attack'],
        multiplier: 1.5,
        message: 'こだわりハチマキで攻撃アップ'
    },
    'こだわりメガネ': {
        type: 'stat_modifier',
        effect_target: ['spAtk'],
        multiplier: 1.5,
        message: 'こだわりメガネで特攻アップ'
    },
    'とつげきチョッキ': {
        type: 'stat_modifier',
        effect_target: ['spDef'],
        multiplier: 1.5,
        message: 'とつげきチョッキで特防アップ'
    },
    'しんかのきせき': {
        type: 'stat_modifier',
        effect_target: ['defence', 'spDef'],
        multiplier: 1.5,
        message: 'しんかのきせきで防御・特防アップ'
    },
    'ふといほね': {
        type: 'stat_modifier',
        effect_target: ['attack'],
        effect_pokemon: ['ガラガラ', 'カラカラ'],
        multiplier: 2.0,
        message: 'カラカラ・ガラガラで攻撃アップ'
    },
    'ブーストエナジー': {
        type: 'stat_modifier',
        effect_target: ['highest'],
        multiplier: 1.3,
        message: 'ブーストエナジーで能力アップ'
    },
    'ちからのハチマキ': {
        type: 'damage_boost',
        effect_target: ['physical_moves'],
        multiplier: 1.1,
        message: 'ちからのハチマキで物理威力アップ',
        boost_phase: 'power'
    },
    'ものしりメガネ': {
        type: 'damage_boost',
        effect_target: ['special_moves'],
        multiplier: 1.1,
        message: 'ものしりメガネで特殊威力アップ',
        boost_phase: 'power'
    },
    'ほのおプレート': {
        type: 'damage_boost',
        effect_target: ['fire_type_moves'],
        multiplier: 1.2,
        message: 'タイプ強化アイテムで威力アップ',
        boost_phase: 'power'
    },
    'いのちのたま': {
        type: 'damage_boost',
        effect_target: ['all'],
        multiplier: 1.3,
        message: 'いのちのたまで威力アップ',
        boost_phase: 'damage'
    },
    'たつじんのおび': {
        type: 'damage_boost',
        effect_target: ['super_effective'],
        multiplier: 1.2,
        message: 'たつじんのおびで威力アップ',
        boost_phase: 'damage'
    }
};

export const MOCK_ABILITIES_DEX = {
    'がんじょうあご': {
        type: 'fang', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'かたいツメ': {
        type: 'contact', offensive: 1.3, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'きれあじ': {
        type: 'blade', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'てつのこぶし': {
        type: 'punch', offensive: 1.2, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'メガランチャー': {
        type: 'hadou', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'パンクロック': {
        type: 'sound', offensive: 1.3, defensive: 0.5,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'ぼうおん': {
        type: 'sound', offensive: 1.0, defensive: 0.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'かぜのり': {
        type: 'wind', offensive: 1.0, defensive: 0.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'ぼうだん': {
        type: 'bullet', offensive: 1.0, defensive: 0.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    },
    'エレキスキン': {
        type: 'skin', offensive: 1.2, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'フェアリースキン': {
        type: 'skin', offensive: 1.2, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'わざわいのつるぎ': {
        type: 'dezaster', offensive: 1.0, defensive: 1.0,
        weaken: 0.75, weakken_stats: 'defence', is_special: false
    },
    'わざわいのおふだ': {
        type: 'dezaster', offensive: 1.0, defensive: 1.0,
        weaken: 0.75, weakken_stats: 'attack', is_special: false
    },
    'テクニシャン': {
        type: 'technician', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'ちからもち': {
        type: 'power_boost', offensive: 2.0, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'ふゆう': {
        type: 'levitate', offensive: 1.0, defensive: 0.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'マルチスケイル': {
        type: 'fullhp_guard', offensive: 1.0, defensive: 0.5,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'ファントムガード': {
        type: 'fullhp_guard', offensive: 1.0, defensive: 0.5,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'げきりゅう': {
        type: 'hp_threshold_boost', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true, boost_type: 'みず'
    },
    'もうか': {
        type: 'hp_threshold_boost', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true, boost_type: 'ほのお'
    },
    'しんりょく': {
        type: 'hp_threshold_boost', offensive: 1.5, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true, boost_type: 'くさ'
    },
    'すてみ': {
        type: 'reckless', offensive: 1.2, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'いしあたま': {
        type: 'rock_head', offensive: 1.0, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: true
    },
    'いろめがね': {
        type: 'tinted_lens', offensive: 2.0, defensive: 1.0,
        weaken: 1.00, weakken_stats: '', is_special: false
    }
};

export const MOCK_MOVE_TYPE_MOVES = {
    fang: new Set(['かみくだく', 'かみつく', 'かみなりのキバ', 'こおりのキバ', 'ほのおのキバ']),
    contact: new Set(['はさむ', 'あなをほる', 'あばれる', 'タックル']),
    blade: new Set(['アクアカッター', 'エアカッター', 'エアスラッシュ', 'つじぎり']),
    punch: new Set(['アイスハンマー', 'アームハンマー', 'メガトンパンチ', 'れいとうパンチ']),
    hadou: new Set(['あくのはどう', 'いやしのはどう', 'だいちのはどう', 'はどうだん']),
    sound: new Set(['いびき', 'ハイパーボイス', 'うたう', 'むしのさざめき', 'ほえる']),
    wind: new Set(['エアカッター', 'かぜおこし', 'ぼうふう', 'こがらし']),
    bullet: new Set(['アシッドボム', 'ウェザーボール', 'エナジーボール', 'シャドーボール'])
};

export const MOCK_KNOWN_DAMAGE_MOVES = {
    'ちきゅうなげ': { damage_type: 'fixed_value', damage_value: 50 },
    'ソニックブーム': { damage_type: 'fixed_value', damage_value: 20 },
    'いかりのまえば': { damage_type: 'ratio_value', damage_value: 0.5 },
    'カタストロフィ': { damage_type: 'ratio_value', damage_value: 0.5 },
    'がむしゃら': { damage_type: 'special_value' },
    'いのちがけ': { damage_type: 'special_value' },
    'いたみわけ': { damage_type: 'special_value' }
};

export const MOCK_SPECIFIC_MOVES = {
    'イカサマ': {
        depend_on_other_stats: true,
        change_target: 'ally', change_target_stats: 'attack',
        change_target_after: 'ennemy', change_target_stats_after: 'attack',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'ボディプレス': {
        depend_on_other_stats: true,
        change_target: 'ally', change_target_stats: 'attack',
        change_target_after: 'ally', change_target_stats_after: 'defence',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'サイコショック': {
        depend_on_other_stats: true,
        change_target: 'ennemy', change_target_stats: 'spDef',
        change_target_after: 'ennemy', change_target_stats_after: 'defence',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'せいなるつるぎ': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: true
    },
    'けたぐり': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: true, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'ヒートスタンプ': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: true,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'ジャイロボール': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: true, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'エレキボール': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: true, depend_on_hp: false,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'しおふき': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: true,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'じたばた': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: true,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'にぎりつぶす': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: true,
        depend_on_ability_rank: false, ignore_stats_change: false
    },
    'アシストパワー': {
        depend_on_other_stats: false,
        change_target: '', change_target_stats: '',
        change_target_after: '', change_target_stats_after: '',
        depend_on_weight: false, depend_on_difference_weight: false,
        depend_on_difference_speed: false, depend_on_hp: false,
        depend_on_ability_rank: true, ignore_stats_change: false
    }
};
