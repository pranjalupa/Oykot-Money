import {
  AirplaneTilt,
  ArrowUUpLeft,
  ArrowUUpRight,
  Bank,
  Barbell,
  Broom,
  Bus,
  Carrot,
  ChartLineUp,
  Coins,
  DotsThree,
  Drop,
  FilmSlate,
  FirstAid,
  ForkKnife,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  House,
  Lightning,
  Money,
  Package,
  Pill,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Storefront,
  TShirt,
  Tag,
  Umbrella,
  Wallet,
  WifiHigh,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

type PhosphorIcon = typeof House;

/**
 * Icons are stored on the category as a Phosphor name. Explicit map rather
 * than a namespace import so the bundle only carries what we actually use,
 * and an unknown name degrades to a tag instead of crashing the page.
 */
const ICONS: Record<string, PhosphorIcon> = {
  AirplaneTilt,
  ArrowUUpLeft,
  ArrowUUpRight,
  Bank,
  Barbell,
  Broom,
  Bus,
  Carrot,
  ChartLineUp,
  Coins,
  DotsThree,
  Drop,
  FilmSlate,
  FirstAid,
  ForkKnife,
  Gift,
  GraduationCap,
  HandCoins,
  Heart,
  House,
  Lightning,
  Money,
  Package,
  Pill,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Storefront,
  TShirt,
  Umbrella,
  Wallet,
  WifiHigh,
};

export const ICON_NAMES = Object.keys(ICONS);

export function CategoryIcon({
  name,
  className,
  size = 16,
}: {
  name: string | null | undefined;
  className?: string;
  size?: number;
}) {
  const Cmp = (name && ICONS[name]) || Tag;
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      <Cmp size={size} weight="duotone" />
    </span>
  );
}
