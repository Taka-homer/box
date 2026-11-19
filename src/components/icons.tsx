// 統一した線画アイコン（24px グリッド、線幅 1.6）

import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 10.5 12 4l8 6.5" />
    <path d="M6 9v10.5h12V9" />
    <path d="M10 19.5v-5h4v5" />
  </Svg>
);

export const BoxIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 8 12 4l8.5 4v8.5L12 20.5l-8.5-4Z" />
    <path d="M3.5 8 12 12l8.5-4" />
    <path d="M12 12v8.5" />
  </Svg>
);

export const SearchIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </Svg>
);

export const PlusIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const DocIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h7l4 4V20.5H7Z" />
    <path d="M14 3.5v4h4" />
    <path d="M9.5 12h6M9.5 15.5h6" />
  </Svg>
);

export const ClockIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 8v4.5l3 1.8" />
  </Svg>
);

export const ListIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 7h11M9 12h11M9 17h11" />
    <circle cx="4.8" cy="7" r=".6" />
    <circle cx="4.8" cy="12" r=".6" />
    <circle cx="4.8" cy="17" r=".6" />
  </Svg>
);

export const GearIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14.3 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2l.4 2.7h4l.4-2.6a7 7 0 0 0 2-1.2l2.3 1 2-3.5-2-1.5c.1-.4.1-.8.1-1.2Z" />
  </Svg>
);

export const ImageIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4 17 5-4.5 3.5 3 3-2.5L20 17" />
  </Svg>
);

export const PinIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20.5s6-5.4 6-10.5a6 6 0 1 0-12 0c0 5.1 6 10.5 6 10.5Z" />
    <circle cx="12" cy="10" r="2.2" />
  </Svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Svg>
);

export const ArrowUpIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
);

export const ArrowDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
);

export const EditIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16Z" />
    <path d="m13.5 6.5 4 4" />
  </Svg>
);

export const TrashIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 7V4.5h5V7" />
    <path d="M6.5 7l1 13h9l1-13" />
    <path d="M10.5 11v5.5M13.5 11v5.5" />
  </Svg>
);

export const CheckIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Svg>
);

export const QuestionIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5v.4" />
    <circle cx="12" cy="16.8" r=".5" />
  </Svg>
);

export const MoveIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h15M14 7l5 5-5 5" />
  </Svg>
);

export const CloseIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
);

export const SparkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3.5 13.8 9l5.7 1.8-5.7 1.8L12 18.2l-1.8-5.6-5.7-1.8L10.2 9Z" />
  </Svg>
);

export const AlertIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4 21 19.5H3Z" />
    <path d="M12 10v4.5" />
    <circle cx="12" cy="17" r=".5" />
  </Svg>
);

export const DownloadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v11M7 10.5l5 5 5-5" />
    <path d="M4.5 19.5h15" />
  </Svg>
);

export const UploadIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V5M7 9.5l5-5 5 5" />
    <path d="M4.5 19.5h15" />
  </Svg>
);

export const LayersIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m12 4 8.5 4.5L12 13 3.5 8.5Z" />
    <path d="m3.5 12.5 8.5 4.5 8.5-4.5" />
    <path d="m3.5 16 8.5 4.5 8.5-4.5" />
  </Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Svg>
);

export const GridIcon = (p: IconProps) => (
  <Svg {...p} fill="currentColor" stroke="none">
    <rect x="4" y="4" width="7" height="7" rx="1.5" />
    <rect x="13" y="4" width="7" height="7" rx="1.5" />
    <rect x="4" y="13" width="7" height="7" rx="1.5" />
    <rect x="13" y="13" width="7" height="7" rx="1.5" />
  </Svg>
);

export const InfoIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5.5" />
    <circle cx="12" cy="7.8" r=".5" />
  </Svg>
);

// ---- 部屋のアイコン ----

export const SofaIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 11V8.5a2.5 2.5 0 0 1 2.5-2.5h8a2.5 2.5 0 0 1 2.5 2.5V11" />
    <path d="M3.5 12.5a1.5 1.5 0 0 1 3 0V14h11v-1.5a1.5 1.5 0 0 1 3 0V17a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1Z" />
    <path d="M6 18v1.5M18 18v1.5" />
  </Svg>
);

export const HangerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 7.5a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2V11" />
    <path d="M12 11 3.6 16.6a.8.8 0 0 0 .4 1.4h16a.8.8 0 0 0 .4-1.4Z" />
  </Svg>
);

export const ToiletIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4h10v6H7Z" />
    <path d="M6 10h12v1.5a6 6 0 0 1-3.5 5.5l.5 3H9l.5-3A6 6 0 0 1 6 11.5Z" />
  </Svg>
);

export const SinkIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 12h17a8.5 6.5 0 0 1-17 0Z" />
    <path d="M12 12V6.5a2 2 0 0 1 4 0" />
    <path d="M9 18.5 8 20.5M15 18.5l1 2" />
  </Svg>
);

export const BedIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 6v13M3.5 15h17v4M20.5 15v-2.5A2.5 2.5 0 0 0 18 10h-7v5" />
    <circle cx="7.5" cy="11.5" r="1.8" />
  </Svg>
);

export const PotIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 10h14v6.5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3Z" />
    <path d="M3 10h18M10 7h4M12 7V5.5" />
  </Svg>
);

export const BookIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v13H6.5A1.5 1.5 0 0 0 5 18.5Z" />
    <path d="M5 18.5A1.5 1.5 0 0 0 6.5 20H19v-3M9 8h6" />
  </Svg>
);

export const DoorIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 20V5a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v15M4 20h16" />
    <path d="M14.5 12.5v.5" />
  </Svg>
);

const ROOM_ICONS: [RegExp, (p: IconProps) => React.ReactElement][] = [
  [/リビング|居間|ダイニング|和室/, SofaIcon],
  [/クローゼット|押し?入れ?|衣装|納戸|物置|倉庫/, HangerIcon],
  [/トイレ|便所/, ToiletIcon],
  [/洗面|浴室|風呂|脱衣|バス/, SinkIcon],
  [/寝室|ベッド|子ども部屋|子供部屋/, BedIcon],
  [/キッチン|台所|パントリー/, PotIcon],
  [/書斎|勉強|仕事|本/, BookIcon],
];

/** 部屋の名前に合ったアイコン。当てはまらなければドア */
export function RoomIcon({ name, ...p }: IconProps & { name: string }) {
  const Icon = ROOM_ICONS.find(([re]) => re.test(name))?.[1] ?? DoorIcon;
  return <Icon {...p} />;
}
