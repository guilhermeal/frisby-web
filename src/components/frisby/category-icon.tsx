// Ícone de categoria por SLUG (o backend persiste strings tipo "utensils").
// Grade curada — cobre os slugs semeados pelo backend + opções genéricas.

import {
  Baby,
  Book,
  Briefcase,
  Car,
  Dumbbell,
  Film,
  Gift,
  GraduationCap,
  Heart,
  Home,
  Landmark,
  PawPrint,
  Plane,
  Shirt,
  ShoppingCart,
  Sparkles,
  Tag,
  TrendingUp,
  Utensils,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  home: Home,
  car: Car,
  heart: Heart,
  book: Book,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  gift: Gift,
  plane: Plane,
  film: Film,
  wifi: Wifi,
  dumbbell: Dumbbell,
  "paw-print": PawPrint,
  baby: Baby,
  shirt: Shirt,
  wrench: Wrench,
  landmark: Landmark,
  "trending-up": TrendingUp,
  sparkles: Sparkles,
  wallet: Wallet,
  tag: Tag,
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? Tag;
  return <Icon className={cn("h-4 w-4", className)} />;
}
