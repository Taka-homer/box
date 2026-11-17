// ホーム画面の飾りイラスト（読み上げ対象外）。画像ファイルを使わず、軽く表示できるようにSVGで描く。
// 斜め上から見た形（奥行きは右上方向）に、グラデーション・影・ハイライトを付けて立体的に見せる。

type Props = { className?: string };

const common = { "aria-hidden": true, focusable: false } as const;

/** 奥行き方向のずれ（右上へ） */
const DEPTH = { x: 0.62, y: 0.42 };

/** 各イラスト共通の塗り（id はイラストごとに接頭辞を付けて重複を避ける） */
function Defs({ p }: { p: string }) {
  const v = (id: string, a: string, b: string) => (
    <linearGradient id={`${p}-${id}`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  const h = (id: string, a: string, b: string) => (
    <linearGradient id={`${p}-${id}`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={a} />
      <stop offset="1" stopColor={b} />
    </linearGradient>
  );
  return (
    <defs>
      {v("box", "#ffffff", "#e3ebf1")}
      {h("boxTop", "#ffffff", "#f1f5f8")}
      {v("boxSide", "#d6e1ea", "#bccbd8")}
      {v("wood", "#f3d7a9", "#dcae70")}
      {h("woodTop", "#fbe8c8", "#f2d4a2")}
      {v("woodSide", "#cf9b5c", "#b9844a")}
      {v("kraft", "#eec189", "#d29c5b")}
      {h("kraftTop", "#f7d8a6", "#eec48a")}
      {v("kraftSide", "#c98f4f", "#b07a3e")}
      {v("steel", "#b7c3ce", "#8a98a6")}
      {v("leafA", "#8fd497", "#4f9e5c")}
      {v("leafB", "#6dbb78", "#367c43")}
      {v("pot", "#ffffff", "#dfe7ed")}
      {v("blue", "#a9d6ee", "#5fa7cf")}
      {v("cream", "#fbefcf", "#ecd49b")}
      {v("paper", "#ffffff", "#e8eef3")}
      {v("window", "#f4fbfe", "#cfeaf5")}
      <radialGradient id={`${p}-shadow`}>
        <stop offset="0" stopColor="#0b3a52" stopOpacity="0.32" />
        <stop offset="1" stopColor="#0b3a52" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
}

const url = (p: string, id: string) => `url(#${p}-${id})`;

/** 床に落ちる柔らかい影 */
function Shadow({ p, cx, cy, rx, ry }: { p: string; cx: number; cy: number; rx: number; ry: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={url(p, "shadow")} />;
}

/** 直方体。x,y は正面の左上、d は奥行き */
function Block({
  p,
  x,
  y,
  w,
  h,
  d,
  front = "box",
  top = "boxTop",
  side = "boxSide",
  stroke = "#c3d2de",
  shine = true,
}: {
  p: string;
  x: number;
  y: number;
  w: number;
  h: number;
  d: number;
  front?: string;
  top?: string;
  side?: string;
  stroke?: string;
  shine?: boolean;
}) {
  const dx = d * DEPTH.x;
  const dy = d * DEPTH.y;
  return (
    <g strokeLinejoin="round">
      <path d={`M${x} ${y}h${w}l${dx} ${-dy}h${-w}Z`} fill={url(p, top)} stroke={stroke} strokeWidth={0.8} />
      <path d={`M${x + w} ${y}l${dx} ${-dy}v${h}l${-dx} ${dy}Z`} fill={url(p, side)} stroke={stroke} strokeWidth={0.8} />
      <rect x={x} y={y} width={w} height={h} fill={url(p, front)} stroke={stroke} strokeWidth={0.8} />
      {shine && <path d={`M${x + 1.5} ${y + 1.2}h${w - 3}`} stroke="#ffffff" strokeWidth={1.4} strokeLinecap="round" opacity={0.9} />}
    </g>
  );
}

/** 取っ手付きの白い収納ボックス */
function Bin({ p, x, y, w, h, d }: { p: string; x: number; y: number; w: number; h: number; d: number }) {
  return (
    <g>
      <Block p={p} x={x} y={y} w={w} h={h} d={d} />
      <rect x={x + w / 2 - w * 0.17} y={y + h * 0.28} width={w * 0.34} height={Math.max(3, h * 0.16)} rx={2} fill="#c9d6e0" />
      <rect x={x + w / 2 - w * 0.17} y={y + h * 0.28} width={w * 0.34} height={1.2} rx={0.6} fill="#9fb2c2" />
    </g>
  );
}

/** 棚板（木の厚み付き） */
function Board({ p, x, y, w, d }: { p: string; x: number; y: number; w: number; d: number }) {
  return <Block p={p} x={x} y={y} w={w} h={4} d={d} front="wood" top="woodTop" side="woodSide" stroke="#c4935a" shine={false} />;
}

function Sparks({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} stroke="#f5c431" strokeWidth={3} strokeLinecap="round">
      <path d="M0 10l-4-9" />
      <path d="M9 12l3-10" />
      <path d="M16 20l8-5" />
    </g>
  );
}

/** 鉢植えの観葉植物。x,y は鉢の上端中央 */
function Plant({ p, x, y, s = 1 }: { p: string; x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0C-6-16-24-22-34-16c6 12 20 20 34 16Z" fill={url(p, "leafB")} />
      <path d="M0 0C4-18 20-28 34-24c-2 14-16 24-34 24Z" fill={url(p, "leafA")} />
      <path d="M0 0c-3-20 3-36 12-44 6 16 0 34-12 44Z" fill={url(p, "leafA")} />
      <path d="M0 0c-12-10-16-28-10-38 10 8 14 26 10 38Z" fill={url(p, "leafB")} />
      <path d="M0 0c8-8 22-10 30-4-6 8-18 10-30 4Z" fill={url(p, "leafB")} />
      <path d="M-4-30C-2-18-1-8 0 0M9-36C6-20 3-8 0 0M-24-14C-14-10-6-6 0 0M24-20C14-12 6-6 0 0" stroke="#2f6e3b" strokeWidth={0.8} fill="none" opacity={0.5} />
      <path d="M-13 1h26l-3.5 20h-19Z" fill={url(p, "pot")} stroke="#c3d2de" strokeWidth={0.8} />
      <ellipse cx="0" cy="1" rx="13" ry="3" fill="#ffffff" stroke="#c3d2de" strokeWidth={0.8} />
      <ellipse cx="0" cy="1.2" rx="10" ry="1.8" fill="#8a6a4a" />
      <path d="M-9 6l-1.5 12" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" opacity={0.9} />
    </g>
  );
}

/** 上部の帯：窓辺の棚と観葉植物 */
export function HeroShelf({ className }: Props) {
  const p = "hero";
  return (
    <svg viewBox="0 0 230 175" className={className} {...common}>
      <Defs p={p} />
      {/* 窓 */}
      <rect x="164" y="6" width="58" height="76" rx="4" fill={url(p, "window")} stroke="#ffffff" strokeWidth={4} />
      <path d="M193 8v72M166 44h54" stroke="#ffffff" strokeWidth={3} />
      <path d="M170 16l14-6M172 26l22-10" stroke="#ffffff" strokeWidth={2} opacity={0.8} strokeLinecap="round" />
      {/* 床の敷物と影 */}
      <path d="M20 168l40-16h170v23H10Z" fill="#ffffff" opacity={0.28} />
      <Shadow p={p} cx={128} cy={163} rx={82} ry={9} />
      <Shadow p={p} cx={36} cy={164} rx={24} ry={5} />
      {/* 棚の柱 */}
      <Block p={p} x={66} y={40} w={5} h={122} d={14} front="woodSide" top="woodTop" side="wood" stroke="#b9844a" shine={false} />
      <Block p={p} x={180} y={40} w={5} h={122} d={14} front="woodSide" top="woodTop" side="wood" stroke="#b9844a" shine={false} />
      {/* 段ごとの中身（奥から手前の順に描く） */}
      <Bin p={p} x={76} y={54} w={46} h={26} d={12} />
      <rect x="130" y="52" width="9" height="28" rx="1" fill={url(p, "paper")} stroke="#c3d2de" strokeWidth={0.8} />
      <rect x="140" y="49" width="9" height="31" rx="1" fill={url(p, "blue")} stroke="#5d97b8" strokeWidth={0.8} />
      <rect x="150" y="53" width="9" height="27" rx="1" fill={url(p, "cream")} stroke="#d1b675" strokeWidth={0.8} />
      <rect x="160" y="55" width="8" height="25" rx="1" fill={url(p, "paper")} stroke="#c3d2de" strokeWidth={0.8} transform="rotate(8 164 67)" />
      <Bin p={p} x={76} y={92} w={46} h={28} d={12} />
      <Bin p={p} x={128} y={92} w={46} h={28} d={12} />
      <Bin p={p} x={76} y={130} w={46} h={28} d={12} />
      <Block p={p} x={128} y={130} w={46} h={28} d={12} front="kraft" top="kraftTop" side="kraftSide" stroke="#b07a3e" shine={false} />
      <path d="M131 137h40M131 144h40M131 151h40" stroke="#b07a3e" strokeWidth={0.9} opacity={0.6} />
      {[40, 80, 120, 158].map((y) => (
        <Board key={y} p={p} x={62} y={y} w={126} d={14} />
      ))}
      <Plant p={p} x={104} y={36} s={0.72} />
      <Plant p={p} x={36} y={140} s={1} />
      <Sparks x={150} y={10} s={0.8} />
    </svg>
  );
}

/** 「ものを探す」：中身の見える収納ボックス */
export function SearchBox({ className }: Props) {
  const p = "find";
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <Defs p={p} />
      <Shadow p={p} cx={58} cy={90} rx={46} ry={7} />
      {/* 中身 */}
      <Block p={p} x={28} y={22} w={20} h={24} d={10} front="blue" top="boxTop" side="blue" stroke="#5d97b8" shine={false} />
      <Block p={p} x={46} y={16} w={18} h={30} d={8} front="paper" top="boxTop" side="boxSide" />
      <rect x="66" y="12" width="14" height="34" rx="7" fill={url(p, "cream")} stroke="#d1b675" strokeWidth={0.8} />
      <ellipse cx="73" cy="12" rx="7" ry="2.4" fill="#fff6dc" stroke="#d1b675" strokeWidth={0.8} />
      {/* 箱（ふたなし） */}
      <path d="M16 42h76l14-10H30Z" fill="#dfe8ef" stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M92 42l14-10v42l-14 12Z" fill={url(p, "boxSide")} stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M16 42h76v44H16Z" fill={url(p, "box")} stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M18 44h72" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
      <rect x="44" y="56" width="20" height="6" rx="3" fill="#c9d6e0" />
      <Sparks x={8} y={10} s={0.8} />
    </svg>
  );
}

/** 「ものを登録」：中身の入った段ボール箱 */
export function OpenCarton({ className }: Props) {
  const p = "add";
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <Defs p={p} />
      <Shadow p={p} cx={58} cy={92} rx={48} ry={6} />
      {/* 中身 */}
      <rect x="40" y="16" width="12" height="36" rx="1" fill={url(p, "blue")} stroke="#5d97b8" strokeWidth={0.8} />
      <rect x="53" y="12" width="11" height="40" rx="1" fill={url(p, "paper")} stroke="#c3d2de" strokeWidth={0.8} />
      <rect x="65" y="18" width="10" height="34" rx="1" fill={url(p, "cream")} stroke="#d1b675" strokeWidth={0.8} />
      <path d="M26 30h14v18H26Z" fill={url(p, "paper")} stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M40 34c5 0 5 8 0 8" stroke="#c3d2de" strokeWidth={1.6} fill="none" />
      {/* 箱 */}
      <path d="M18 46h72l12-9H30Z" fill="#b98146" />
      <path d="M18 46h72v42H18Z" fill={url(p, "kraft")} stroke="#b07a3e" strokeWidth={0.8} />
      <path d="M90 46l12-9v40l-12 11Z" fill={url(p, "kraftSide")} stroke="#b07a3e" strokeWidth={0.8} />
      {/* 開いたふた */}
      <path d="M18 46 4 38l16-6 10 5Z" fill={url(p, "kraftTop")} stroke="#b07a3e" strokeWidth={0.8} />
      <path d="M90 46l14 6 10-11-12-4Z" fill={url(p, "kraftTop")} stroke="#b07a3e" strokeWidth={0.8} />
      <path d="M54 46v42" stroke="#c48b4c" strokeWidth={2} />
      <path d="M20 48h68" stroke="#f8dcae" strokeWidth={1.4} strokeLinecap="round" />
      <Sparks x={88} y={2} s={0.9} />
    </svg>
  );
}

/** 「収納場所」：ボックスの入ったスチール棚 */
export function SteelShelf({ className }: Props) {
  const p = "place";
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <Defs p={p} />
      <Shadow p={p} cx={62} cy={94} rx={48} ry={5} />
      <Block p={p} x={14} y={22} w={3} h={72} d={10} front="steel" top="boxTop" side="steel" stroke="#7d8b99" shine={false} />
      <Block p={p} x={98} y={22} w={3} h={72} d={10} front="steel" top="boxTop" side="steel" stroke="#7d8b99" shine={false} />
      <Bin p={p} x={20} y={32} w={36} h={22} d={9} />
      <Bin p={p} x={60} y={32} w={36} h={22} d={9} />
      <Bin p={p} x={20} y={62} w={36} h={22} d={9} />
      <Bin p={p} x={60} y={62} w={36} h={22} d={9} />
      {[22, 54, 84].map((y) => (
        <Board key={y} p={p} x={12} y={y} w={92} d={10} />
      ))}
      <Plant p={p} x={86} y={20} s={0.55} />
    </svg>
  );
}

/** 「書類」：ファイルボックスに立てた書類 */
export function FileBox({ className }: Props) {
  const p = "doc";
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <Defs p={p} />
      <Shadow p={p} cx={62} cy={92} rx={42} ry={6} />
      {/* 書類 */}
      <rect x="34" y="14" width="18" height="58" rx="2" fill={url(p, "blue")} stroke="#5d97b8" strokeWidth={0.8} transform="rotate(-9 43 43)" />
      <rect x="46" y="10" width="18" height="62" rx="2" fill={url(p, "cream")} stroke="#d1b675" strokeWidth={0.8} transform="rotate(-4 55 41)" />
      <rect x="58" y="12" width="18" height="60" rx="2" fill={url(p, "paper")} stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M62 20h10M62 25h10M62 30h7" stroke="#b9c8d4" strokeWidth={1.2} strokeLinecap="round" />
      <rect x="70" y="16" width="16" height="56" rx="2" fill={url(p, "blue")} stroke="#5d97b8" strokeWidth={0.8} transform="rotate(6 78 44)" />
      {/* ファイルボックス（斜めに切った形） */}
      <path d="M90 44l12-8v44l-12 10Z" fill={url(p, "boxSide")} stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M28 54l62-10v46H28Z" fill={url(p, "box")} stroke="#c3d2de" strokeWidth={0.8} />
      <path d="M30 55.5l58-9.4" stroke="#ffffff" strokeWidth={1.6} strokeLinecap="round" />
      <rect x="50" y="70" width="18" height="5" rx="2.5" fill="#c9d6e0" />
    </svg>
  );
}

/** 「最近の登録」：積み重ねた箱 */
export function StackedBoxes({ className }: Props) {
  const p = "new";
  return (
    <svg viewBox="0 0 120 100" className={className} {...common}>
      <Defs p={p} />
      <Shadow p={p} cx={62} cy={92} rx={48} ry={6} />
      <Bin p={p} x={14} y={30} w={48} h={58} d={12} />
      <path d="M14 42h48" stroke="#c3d2de" strokeWidth={0.8} />
      <Block p={p} x={62} y={58} w={40} h={30} d={12} front="kraft" top="kraftTop" side="kraftSide" stroke="#b07a3e" shine={false} />
      <path d="M82 58l7.4-5" stroke="#c48b4c" strokeWidth={2} />
      <path d="M82 58v30" stroke="#c48b4c" strokeWidth={2} />
      <Sparks x={84} y={14} s={0.9} />
    </svg>
  );
}
