// ホーム画面の飾りイラスト（読み上げ対象外）。画像ファイルを使わず、軽く表示できるようにSVGで描く。

type Props = { className?: string };

const common = { "aria-hidden": true, focusable: false } as const;

const WOOD = "#e9c99a";
const WOOD_DARK = "#c99d63";
const BOX = "#ffffff";
const BOX_SIDE = "#e4ecf2";
const BOX_LINE = "#c7d6e1";
const LEAF = "#5fae6b";
const LEAF_DARK = "#3f8a4d";
const POT = "#f3f6f8";

function Sparks({ x, y }: { x: number; y: number }) {
  return (
    <g stroke="#f2c230" strokeWidth={3} strokeLinecap="round">
      <path d={`M${x} ${y + 10}l-4-9`} />
      <path d={`M${x + 9} ${y + 12}l3-10`} />
      <path d={`M${x + 16} ${y + 20}l8-5`} />
    </g>
  );
}

function Plant({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0c-8-14-22-16-30-12 6 10 18 16 30 12Z" fill={LEAF} />
      <path d="M0 0c4-16 18-24 30-22-2 12-14 22-30 22Z" fill={LEAF_DARK} />
      <path d="M0 0c-2-18 4-32 12-38 4 14-2 30-12 38Z" fill={LEAF} />
      <path d="M0 0c-10-10-12-26-8-34 8 8 12 22 8 34Z" fill={LEAF_DARK} />
      <path d="M-12 0h24l-3 18h-18Z" fill={POT} stroke={BOX_LINE} strokeWidth={1.5} />
    </g>
  );
}

function Bin({ x, y, w = 34, h = 22, fill = BOX }: { x: number; y: number; w?: number; h?: number; fill?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={3} fill={fill} stroke={BOX_LINE} strokeWidth={1.5} />
      <rect x={x + w / 2 - 6} y={y + 6} width={12} height={4} rx={2} fill={BOX_SIDE} />
    </g>
  );
}

/** 上部の帯：棚と観葉植物のある部屋 */
export function HeroShelf({ className }: Props) {
  return (
    <svg viewBox="0 0 220 170" className={className} {...common}>
      <rect x="150" y="10" width="62" height="70" rx="4" fill="#eaf7fb" stroke="#ffffff" strokeWidth={4} opacity={0.9} />
      <path d="M181 12v66M152 45h58" stroke="#ffffff" strokeWidth={3} />
      <ellipse cx="110" cy="160" rx="100" ry="10" fill="#ffffff" opacity={0.35} />
      {/* 棚 */}
      <rect x="62" y="40" width="6" height="118" fill={WOOD_DARK} />
      <rect x="176" y="40" width="6" height="118" fill={WOOD_DARK} />
      {[40, 78, 116, 152].map((y) => (
        <rect key={y} x="58" y={y} width="128" height="6" rx="2" fill={WOOD} />
      ))}
      <Bin x={74} y={52} w={44} h={26} />
      <rect x="126" y="50" width="8" height="28" rx="1" fill="#ffffff" stroke={BOX_LINE} />
      <rect x="136" y="48" width="8" height="30" rx="1" fill="#d8e9f3" stroke={BOX_LINE} />
      <rect x="146" y="52" width="8" height="26" rx="1" fill="#ffffff" stroke={BOX_LINE} />
      <Bin x={74} y={90} w={44} h={26} />
      <Bin x={124} y={90} w={44} h={26} />
      <Bin x={74} y={126} w={44} h={26} />
      <rect x="124" y="126" width="44" height="26" rx="3" fill="#d9b37c" stroke={WOOD_DARK} strokeWidth={1.5} />
      <path d="M128 133h36M128 140h36M128 147h36" stroke={WOOD_DARK} strokeWidth={1} />
      <Plant x={96} y={30} s={0.8} />
      <Plant x={30} y={140} s={1} />
    </svg>
  );
}

/** 「ものを探す」：ふたの開いた収納ボックス */
export function SearchBox({ className }: Props) {
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <ellipse cx="60" cy="92" rx="48" ry="6" fill="#ffffff" opacity={0.35} />
      <rect x="40" y="28" width="22" height="20" rx="3" fill="#8fc8e8" />
      <rect x="44" y="24" width="22" height="22" rx="3" fill="#bfe1f3" />
      <rect x="66" y="26" width="16" height="22" rx="8" fill="#f1d9a8" />
      <path d="M18 40h84l-6 48H24Z" fill={BOX} stroke={BOX_LINE} strokeWidth={2} />
      <path d="M18 40h84" stroke={BOX_LINE} strokeWidth={2} />
      <rect x="50" y="56" width="20" height="6" rx="3" fill={BOX_SIDE} />
      <Sparks x={12} y={8} />
    </svg>
  );
}

/** 「ものを登録」：中身の入った段ボール箱 */
export function OpenCarton({ className }: Props) {
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <rect x="42" y="18" width="12" height="34" rx="1" fill="#7fb8d9" />
      <rect x="55" y="14" width="10" height="38" rx="1" fill="#ffffff" stroke={BOX_LINE} />
      <rect x="28" y="30" width="14" height="16" rx="4" fill="#e9f3f9" stroke={BOX_LINE} />
      <path d="M20 44h76v44H20Z" fill="#e3b77c" />
      <path d="M20 44 8 34h76l12 10Z" fill="#f0cc96" />
      <path d="M96 44l14-12v10L96 56Z" fill="#d6a86c" />
      <path d="M20 44 6 52l2 8 12-6Z" fill="#d6a86c" />
      <path d="M56 44v44" stroke="#c99a5f" strokeWidth={2} />
      <Sparks x={86} y={2} />
    </svg>
  );
}

/** 「収納場所」：ボックスの入ったスチール棚 */
export function SteelShelf({ className }: Props) {
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <rect x="18" y="20" width="4" height="76" fill="#8a98a6" />
      <rect x="98" y="20" width="4" height="76" fill="#8a98a6" />
      {[22, 52, 82].map((y) => (
        <rect key={y} x="14" y={y} width="92" height="5" rx="1" fill={WOOD} />
      ))}
      <Bin x={24} y={30} w={34} h={22} />
      <Bin x={62} y={30} w={34} h={22} />
      <Bin x={24} y={60} w={34} h={22} />
      <Bin x={62} y={60} w={34} h={22} />
      <Plant x={86} y={18} s={0.6} />
    </svg>
  );
}

/** 「書類」：ファイルボックスに立てた書類 */
export function FileBox({ className }: Props) {
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <rect x="34" y="14" width="18" height="56" rx="2" fill="#a9d1ea" transform="rotate(-8 43 42)" />
      <rect x="46" y="10" width="18" height="60" rx="2" fill="#f4e3b5" transform="rotate(-4 55 40)" />
      <rect x="58" y="12" width="18" height="58" rx="2" fill="#ffffff" stroke={BOX_LINE} />
      <rect x="70" y="16" width="16" height="54" rx="2" fill="#7fb8d9" transform="rotate(5 78 43)" />
      <path d="M26 48l66-6 6 46H32Z" fill={BOX} stroke={BOX_LINE} strokeWidth={2} />
      <rect x="54" y="66" width="18" height="5" rx="2.5" fill={BOX_SIDE} />
    </svg>
  );
}

/** 「最近の登録」：積み重ねた箱 */
export function StackedBoxes({ className }: Props) {
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <rect x="18" y="26" width="52" height="62" rx="3" fill={BOX} stroke={BOX_LINE} strokeWidth={2} />
      <path d="M18 38h52" stroke={BOX_LINE} strokeWidth={2} />
      <rect x="36" y="48" width="16" height="5" rx="2.5" fill={BOX_SIDE} />
      <rect x="64" y="56" width="42" height="32" rx="2" fill="#e3b77c" />
      <path d="M64 56l6-8h42l-6 8Z" fill="#f0cc96" />
      <path d="M85 56v32" stroke="#c99a5f" strokeWidth={2} />
      <Sparks x={82} y={14} />
    </svg>
  );
}
