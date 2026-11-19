// ホーム画面の飾りイラスト（読み上げ対象外）。画像は public/images/home にある。

/* eslint-disable @next/next/no-img-element -- 小さな静的画像なので最適化は不要 */

type Props = { className?: string };

function Art({ src, className = "" }: { src: string; className?: string }) {
  return <img src={src} alt="" aria-hidden="true" draggable={false} decoding="async" className={className} />;
}

/**
 * 上部の帯：窓辺の棚と観葉植物。
 * 画像の背景が帯の色となじむよう、左と上の端をぼかす。
 */
export function HeroShelf({ className = "" }: Props) {
  return (
    <Art
      src="/images/home/hero-shelf.png"
      className={`[mask-image:linear-gradient(to_right,transparent,black_35%),linear-gradient(to_bottom,transparent,black_20%)] [mask-composite:intersect] ${className}`}
    />
  );
}

/**
 * 「収納場所」ページの帯：タンスとクローゼット。
 * 横長の画像なので、左右と上の端をぼかして帯の色になじませる。
 */
export function ClosetArt({ className = "" }: Props) {
  return (
    <Art
      src="/images/places/closet.webp"
      className={`[mask-image:linear-gradient(to_right,transparent,black_30%,black_92%,transparent),linear-gradient(to_bottom,transparent,black_18%)] [mask-composite:intersect] ${className}`}
    />
  );
}

/** 「ものを探す」：中身の見える収納ボックス */
export function SearchBox({ className = "" }: Props) {
  return <Art src="/images/home/search-box.png" className={`rounded-2xl object-cover ${className}`} />;
}

// 以下はメニューの淡い色のカードに置く。背景をカードの色になじませ、四角いふちが見えないよう左と上をぼかす。

const SOFT_EDGE =
  "mix-blend-multiply [mask-image:linear-gradient(to_right,transparent,black_30%),linear-gradient(to_bottom,transparent,black_25%)] [mask-composite:intersect]";

/** 「ものを登録」：中身の入った段ボール箱 */
export function OpenCarton({ className = "" }: Props) {
  return <Art src="/images/home/open-carton.png" className={`${SOFT_EDGE} ${className}`} />;
}

/** 「収納場所」：タンスとクローゼット（ClosetArt と同じ画像を、淡い色のカード向けに表示する） */
export function SteelShelf({ className = "" }: Props) {
  return <Art src="/images/places/closet.webp" className={`${SOFT_EDGE} ${className}`} />;
}

/** 「書類」：ファイルボックスに立てた書類 */
export function FileBox({ className = "" }: Props) {
  return <Art src="/images/home/file-box.png" className={`${SOFT_EDGE} ${className}`} />;
}

/** 「最近の登録」：積み重ねた箱 */
export function StackedBoxes({ className = "" }: Props) {
  return <Art src="/images/home/stacked-boxes.png" className={`${SOFT_EDGE} ${className}`} />;
}

const SPOT_SRC = {
  carton: "/images/home/open-carton.png",
  shelf: "/images/places/closet.webp",
  files: "/images/home/file-box.png",
  boxes: "/images/home/stacked-boxes.png",
} as const;

/** 「まだ登録がない」案内の中央に置くイラスト。四方のふちをぼかす */
export function SpotArt({ name, className = "" }: { name: keyof typeof SPOT_SRC; className?: string }) {
  return (
    <Art
      src={SPOT_SRC[name]}
      className={`h-32 w-auto mix-blend-multiply [mask-image:radial-gradient(closest-side,black_72%,transparent)] sm:h-36 ${className}`}
    />
  );
}
