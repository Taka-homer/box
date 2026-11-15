// 関連語辞書。AIは使わず、家庭でよく使う言葉の対応表で検索の言葉を広げる。
//
// - SYNONYMS（言い換え・双方向）：同じものを指す言葉。「マニュアル」⇔「取扱説明書」
// - RELATED（関連・一方向）：探す言葉 → 関係するもの。「修理」→「保証書」
//   一方向にすることで、「保証書」で探したときに修理関係のもの全部が出るような広がりすぎを防ぐ。

import { normalizeText } from "./text";

export const SYNONYMS: string[][] = [
  ["エアコン", "クーラー", "空調"],
  ["ストーブ", "ヒーター", "ファンヒーター"],
  ["給湯器", "ボイラー", "湯沸かし器"],
  ["掃除機", "クリーナー"],
  ["テレビ", "TV"],
  ["パソコン", "PC", "ノートパソコン"],
  ["スマホ", "スマートフォン", "携帯電話"],
  ["充電器", "ACアダプター", "アダプター"],
  ["電池", "乾電池"],
  ["説明書", "取扱説明書", "取説", "マニュアル", "取扱書"],
  ["保証書", "保証"],
  ["領収書", "レシート"],
  ["修理", "故障", "壊れ"],
  ["住宅ローン", "ローン"],
  ["権利証", "権利書", "登記識別情報"],
  ["車", "自動車", "クルマ"],
  ["車検証", "自動車検査証"],
  ["源泉徴収票", "源泉徴収"],
  ["印鑑", "はんこ", "ハンコ"],
  ["マイナンバーカード", "マイナンバー", "マイナカード"],
  ["ドライバー", "ねじ回し"],
  ["ハンマー", "金づち", "かなづち", "トンカチ"],
  ["のこぎり", "ノコギリ"],
  ["メジャー", "巻尺"],
  ["組み立て", "組立"],
  ["ネジ", "ねじ", "ボルト"],
  ["段ボール", "ダンボール"],
  ["ガムテープ", "布テープ", "梱包テープ"],
  ["はさみ", "ハサミ"],
  ["ホッチキス", "ステープラー"],
  ["ひも", "紐"],
  ["ひな人形", "雛人形", "ひな祭り"],
  ["五月人形", "兜"],
  ["こいのぼり", "鯉のぼり"],
  ["正月", "お正月"],
  ["飾り", "飾る", "装飾", "オーナメント"],
  ["懐中電灯", "ライト"],
  ["絆創膏", "ばんそうこう"],
  ["布団", "ふとん"],
  ["喪服", "礼服", "ブラックフォーマル"],
  ["ふくさ", "袱紗"],
  ["バーベキュー", "BBQ"],
  ["レインコート", "カッパ", "雨合羽"],
  ["靴", "くつ"],
  ["鍵", "カギ", "合鍵", "スペアキー"],
  ["おもちゃ", "玩具"],
  ["ゴミ", "ごみ"],
  ["ゴミ袋", "ごみ袋"],
  ["道具", "工具"],
  ["文房具", "文具"],
  ["ガーデニング", "園芸"],
  ["非常用", "防災", "災害"],
  ["赤ちゃん", "ベビー"],
  ["寝具", "布団類"],
  ["衣類", "服"],
  ["日用品", "ストック", "買い置き"],
];

export const RELATED: Record<string, string[]> = {
  // 家電・設備
  冷房: ["エアコン", "扇風機", "サーキュレーター"],
  暖房: ["エアコン", "ストーブ", "こたつ", "電気毛布", "ホットカーペット"],
  エアコン: ["リモコン", "フィルター", "室外機"],
  給湯器: ["リモコン"],
  テレビ: ["リモコン", "レコーダー", "アンテナ", "B-CAS"],
  パソコン: ["マウス", "キーボード", "充電器", "ケーブル", "ルーター", "プリンター"],
  プリンター: ["インク", "トナー", "用紙"],
  充電: ["充電器", "ケーブル", "USB", "モバイルバッテリー"],
  付属品: ["リモコン", "ケーブル", "充電器", "フィルター", "替え", "交換用"],
  部品: ["リモコン", "ケーブル", "フィルター", "替え", "交換用"],
  電気: ["ブレーカー", "延長コード", "電源タップ", "電球"],
  照明: ["電球", "蛍光灯", "LED"],
  水回り: ["蛇口", "パッキン", "ラバーカップ", "排水"],
  水漏れ: ["蛇口", "パッキン", "排水"],
  詰まり: ["ラバーカップ", "排水"],

  // 書類
  書類: [
    "説明書", "保証書", "契約書", "領収書", "証明書", "明細", "通知", "車検証", "保険証券",
    "権利証", "源泉徴収票", "通知表", "母子手帳", "年金手帳", "パスポート", "ファイル",
  ],
  修理: ["保証書", "説明書", "領収書"],
  点検: ["説明書", "保証書"],
  使い方: ["説明書"],
  住宅: ["権利証", "登記", "固定資産税", "住宅ローン", "図面", "間取り", "契約書"],
  車: ["車検証", "自賠責", "タイヤ", "チャイルドシート", "スペアキー"],
  自転車: ["空気入れ", "防犯登録", "ヘルメット"],
  お金: ["通帳", "印鑑", "キャッシュカード", "実印", "銀行印"],
  銀行: ["通帳", "印鑑", "キャッシュカード", "銀行印"],
  税金: ["源泉徴収票", "領収書", "控除", "医療費", "マイナンバーカード"],
  確定申告: ["源泉徴収票", "領収書", "控除", "医療費", "マイナンバーカード"],
  年末調整: ["源泉徴収票", "控除", "保険"],
  身分証: ["パスポート", "免許証", "マイナンバーカード", "保険証"],
  本人確認: ["パスポート", "免許証", "マイナンバーカード", "保険証"],
  病院: ["保険証", "診察券", "お薬手帳", "母子手帳"],
  学校: ["通知表", "教科書", "制服", "卒業アルバム"],

  // 工具・作業
  道具: [
    "ドライバー", "電動ドライバー", "ドリル", "インパクト", "ハンマー", "ペンチ", "レンチ",
    "スパナ", "六角レンチ", "のこぎり", "メジャー", "工具箱", "カッター",
  ],
  組み立て: ["ドライバー", "電動ドライバー", "六角レンチ", "ネジ", "工具"],
  DIY: ["ドライバー", "電動ドライバー", "ドリル", "のこぎり", "六角レンチ", "ネジ", "工具"],
  梱包: ["段ボール", "ガムテープ", "緩衝材", "プチプチ", "ひも"],
  引っ越し: ["段ボール", "ガムテープ", "緩衝材", "プチプチ", "ひも"],
  文房具: ["ペン", "ボールペン", "鉛筆", "はさみ", "テープ", "のり", "ホッチキス", "封筒", "便箋"],
  裁縫: ["針", "糸", "ボタン", "ミシン", "裁縫箱"],
  ガーデニング: ["ホース", "肥料", "スコップ", "剪定", "植木鉢", "じょうろ", "草刈り"],
  庭: ["ホース", "肥料", "スコップ", "剪定", "植木鉢", "じょうろ", "草刈り"],

  // 季節・行事
  年末: ["クリスマス", "大掃除", "年賀状", "正月"],
  年始: ["正月", "鏡餅", "年賀状"],
  クリスマス: ["ツリー", "オーナメント", "リース", "サンタ", "飾り"],
  正月: ["鏡餅", "しめ縄", "門松", "年賀状"],
  節句: ["ひな人形", "五月人形", "こいのぼり"],
  飾り: ["クリスマス", "ツリー", "リース", "ひな人形", "五月人形", "正月飾り", "置物"],
  季節: ["扇風機", "ヒーター", "こたつ", "加湿器", "クリスマス", "ひな人形", "五月人形", "夏物", "冬物"],
  季節用品: ["扇風機", "ヒーター", "こたつ", "加湿器", "クリスマス", "ひな人形", "五月人形", "夏物", "冬物"],
  衣替え: ["夏物", "冬物", "夏服", "冬服", "コート"],
  夏: ["扇風機", "蚊取り", "浮き輪", "水着", "日傘", "うちわ", "花火", "夏物", "夏服"],
  冬: ["こたつ", "ストーブ", "加湿器", "毛布", "手袋", "マフラー", "冬物", "冬服", "スキー"],

  // 暮らし
  非常用: ["懐中電灯", "ラジオ", "非常食", "保存水", "乾電池", "ヘルメット", "備蓄", "カセットコンロ", "簡易トイレ"],
  地震: ["懐中電灯", "ラジオ", "非常食", "保存水", "乾電池", "ヘルメット", "備蓄"],
  停電: ["懐中電灯", "ラジオ", "乾電池", "モバイルバッテリー", "カセットコンロ"],
  救急: ["救急箱", "絆創膏", "消毒", "包帯", "湿布", "体温計"],
  けが: ["救急箱", "絆創膏", "消毒", "包帯", "湿布"],
  怪我: ["救急箱", "絆創膏", "消毒", "包帯", "湿布"],
  薬: ["救急箱", "体温計", "常備薬", "風邪薬", "お薬手帳"],
  熱: ["体温計", "風邪薬", "冷却シート"],
  掃除: ["掃除機", "洗剤", "ほうき", "モップ", "雑巾", "紙パック"],
  洗濯: ["洗濯機", "洗剤", "柔軟剤", "ハンガー", "物干し", "洗濯ばさみ"],
  キッチン: ["鍋", "フライパン", "包丁", "ホットプレート", "ミキサー", "食器", "調味料"],
  台所: ["鍋", "フライパン", "包丁", "ホットプレート", "ミキサー", "食器", "調味料"],
  料理: ["鍋", "フライパン", "包丁", "ホットプレート", "ミキサー", "調味料"],
  来客: ["客用", "布団", "座布団", "スリッパ", "食器"],
  寝具: ["布団", "毛布", "シーツ", "枕", "カバー"],
  衣類: ["コート", "喪服", "ネクタイ", "夏服", "冬服", "シャツ"],
  冠婚葬祭: ["喪服", "数珠", "ふくさ", "ご祝儀袋", "香典袋", "のし袋", "ネクタイ"],
  葬式: ["喪服", "数珠", "ふくさ", "香典袋"],
  法事: ["喪服", "数珠", "ふくさ", "香典袋"],
  結婚式: ["礼服", "ふくさ", "ご祝儀袋", "ネクタイ"],
  キャンプ: ["テント", "バーベキュー", "クーラーボックス", "レジャーシート", "寝袋", "ランタン"],
  アウトドア: ["テント", "バーベキュー", "クーラーボックス", "レジャーシート", "寝袋", "ランタン"],
  雨: ["傘", "レインコート", "長靴", "雨具"],
  思い出: ["アルバム", "写真", "卒業アルバム", "ビデオ", "DVD", "手紙"],
  赤ちゃん: ["おむつ", "母子手帳", "ベビーカー", "チャイルドシート"],
  ペット: ["犬", "猫", "ペットフード", "リード", "トイレ砂", "ワクチン"],
  ゴミ: ["ゴミ袋", "分別表", "粗大ごみ"],
  日用品: ["トイレットペーパー", "ティッシュ", "洗剤", "シャンプー", "詰め替え", "電池"],
  スポーツ: ["ゴルフ", "スキー", "ボール", "ラケット", "ユニフォーム"],
};

export interface Term {
  norm: string;
  label: string;
}

interface DictionaryData {
  /** 正規化した言葉 → 言い換えの言葉（自分を含む） */
  synonyms: Map<string, Term[]>;
  /** 正規化した言葉 → 関連する言葉 */
  related: Map<string, Term[]>;
  /** 長い言葉から順に並べた全見出し語 */
  terms: Term[];
}

const toTerm = (label: string): Term => ({ label, norm: normalizeText(label) });

export function buildDictionary(
  synonymGroups: string[][] = SYNONYMS,
  relatedMap: Record<string, string[]> = RELATED,
): DictionaryData {
  const synonyms = new Map<string, Term[]>();
  const all = new Map<string, Term>();
  const remember = (t: Term) => {
    if (t.norm && !all.has(t.norm)) all.set(t.norm, t);
  };
  for (const group of synonymGroups) {
    const terms = group.map(toTerm);
    for (const t of terms) {
      remember(t);
      const merged = new Map((synonyms.get(t.norm) ?? []).map((x) => [x.norm, x]));
      for (const x of terms) merged.set(x.norm, x);
      synonyms.set(t.norm, [...merged.values()]);
    }
  }
  const related = new Map<string, Term[]>();
  for (const [key, values] of Object.entries(relatedMap)) {
    const k = toTerm(key);
    remember(k);
    const terms = values.map(toTerm);
    terms.forEach(remember);
    related.set(k.norm, [...(related.get(k.norm) ?? []), ...terms]);
  }
  const terms = [...all.values()].sort((a, b) => b.norm.length - a.norm.length);
  return { synonyms, related, terms };
}

export type Dictionary = ReturnType<typeof buildDictionary>;

const DEFAULT_DICTIONARY = buildDictionary();
const cache = new WeakMap<object, Dictionary>();

/** 内蔵の辞書に、マイ辞書の言葉の組（言い換えとして扱う）を加えた辞書を返す */
export function dictionaryWith(myGroups: { words: string[] }[]): Dictionary {
  if (myGroups.length === 0) return DEFAULT_DICTIONARY;
  const cached = cache.get(myGroups);
  if (cached) return cached;
  const dict = buildDictionary([...SYNONYMS, ...myGroups.map((g) => g.words)], RELATED);
  cache.set(myGroups, dict);
  return dict;
}

/** 言葉を、言い換え → 関連する言葉 → その言い換え の順に広げる */
function expand(seed: Term[], dict: Dictionary): Term[] {
  const out = new Map<string, Term>();
  const addWithSynonyms = (t: Term) => {
    out.set(t.norm, out.get(t.norm) ?? t);
    for (const s of dict.synonyms.get(t.norm) ?? []) if (!out.has(s.norm)) out.set(s.norm, s);
  };
  seed.forEach(addWithSynonyms);
  const base = [...out.values()];
  for (const t of base) for (const r of dict.related.get(t.norm) ?? []) addWithSynonyms(r);
  return [...out.values()];
}

/** 検索文から取り出した1つの意味のまとまり。いずれかの言葉が含まれていれば一致とみなす */
export interface Concept {
  /** 画面に出す言葉（入力された言葉、または辞書の見出し語） */
  label: string;
  /** 一致を調べる言葉（正規化済み） */
  terms: Term[];
}

/**
 * 検索文を意味のまとまりに分ける。
 * 例：「冷房の修理に必要な書類」→ 冷房／修理／書類（それぞれ関連語に広げる）
 */
export function extractConcepts(query: string, dict: Dictionary = DEFAULT_DICTIONARY): Concept[] {
  const concepts: Concept[] = [];
  const tokens = query.normalize("NFKC").split(/\s+/).filter(Boolean);
  for (const original of tokens) {
    const token = normalizeText(original);
    if (!token) continue;

    // 検索文の中に含まれる辞書の言葉（長いものを優先し、その一部である短い言葉は除く）
    const found: Term[] = [];
    for (const t of dict.terms) {
      if (token.includes(t.norm) && !found.some((f) => f.norm.includes(t.norm))) found.push(t);
    }
    if (found.length > 0) {
      found.sort((a, b) => token.indexOf(a.norm) - token.indexOf(b.norm));
      for (const t of found) concepts.push({ label: t.label, terms: expand([t], dict) });
      continue;
    }

    // 言葉の一部だけが入力された場合（例：「説明」→ 説明書）
    const partial = token.length >= 2 ? dict.terms.filter((t) => t.norm.includes(token)) : [];
    const terms = expand(partial, dict);
    if (!terms.some((t) => t.norm === token)) terms.push({ norm: token, label: original });
    concepts.push({ label: original, terms });
  }
  return concepts;
}

/** 対象の文字列（正規化済み）で一致した関連語を返す。一致しなければ null */
export function matchConcept(haystack: string, concept: Concept): Term | null {
  return concept.terms.find((t) => haystack.includes(t.norm)) ?? null;
}
