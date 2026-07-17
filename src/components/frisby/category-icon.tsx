// Ícone de categoria por SLUG (o backend persiste strings tipo "utensils").
// Grade curada — cobre os slugs semeados pelo backend + opções genéricas +
// as categorias importadas (receitas e despesas) do usuário.

import { cn } from "@/lib/utils";
import {
  Baby,
  Banknote,
  Beaker,
  Bike,
  Book,
  Briefcase,
  Bus,
  Car,
  Coins,
  CreditCard,
  Dumbbell,
  FileText,
  Film,
  Fuel,
  Gift,
  GraduationCap,
  Hammer,
  HandCoins,
  Headphones,
  Heart,
  HelpCircle,
  Home,
  Landmark,
  Laptop,
  Leaf,
  LineChart,
  MonitorSmartphone,
  Package,
  PartyPopper,
  PawPrint,
  Percent,
  PiggyBank,
  Plane,
  Receipt,
  ReceiptText,
  Scissors,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Stethoscope,
  Store,
  Tag,
  TrendingUp,
  Users,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Wifi,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // ── Já existentes (mantidos) ──────────────────────────────────────────
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

  // ── Despesas — categorias do usuário ──────────────────────────────────
  "utensils-crossed": UtensilsCrossed, // Alimentação (alternativa mais "prato")
  scissors: Scissors, // Beleza (salão/barbearia)
  leaf: Leaf, // Bem Estar
  "graduation-cap-2": GraduationCap, // Educação (reaproveita graduation-cap)
  "party-popper": PartyPopper, // Lazer
  "help-circle": HelpCircle, // Não Identificados
  package: Package, // Outros Serviços
  receipt: Receipt, // Quitação de Débitos
  "receipt-text": ReceiptText, // Tributos (boletos/impostos)
  stethoscope: Stethoscope, // Saúde
  "monitor-smartphone": MonitorSmartphone, // Serviços Digitais
  users: Users, // Funcionários
  "shopping-bag": ShoppingBag, // Utilidades / Futilidades
  bus: Bus, // Transporte (alternativa a car)
  fuel: Fuel, // Combustível
  bike: Bike, // Transporte alternativo

  // ── Receitas — categorias do usuário ──────────────────────────────────
  store: Store, // Comércio
  "line-chart": LineChart, // Investimentos
  banknote: Banknote, // Salário / R.Fixos
  "hand-coins": HandCoins, // Renda Extra
  coins: Coins, // Financeiro (receita)
  "piggy-bank": PiggyBank, // Poupança/Investimento genérico
  percent: Percent, // Juros/Rendimento

  // ── Genéricos extras (uso futuro em subcategorias) ────────────────────
  laptop: Laptop, // Equipamentos/Tecnologia
  smartphone: Smartphone, // Celular/Assinaturas
  headphones: Headphones, // Entretenimento/Áudio
  hammer: Hammer, // Reforma/Ferramentas
  "credit-card": CreditCard, // Cartão/Fatura
  beaker: Beaker, // Farmácia/Exames (alternativa a stethoscope)
  "file-text": FileText, // Documentos/Contratos
};

export function CategoryIcon({ slug, className }: { slug: string; className?: string }) {
  const Icon = CATEGORY_ICONS[slug] ?? Tag;
  return <Icon className={cn("h-4 w-4", className)} />;
}
