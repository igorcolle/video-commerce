// =====================================================================
// OptionIcon — renderizador ÚNICO do ícone de um botão de decisão.
// Usado no player E na pré-visualização do admin, para ficarem idênticos.
//
// Formato do campo `options.icon` (retrocompatível):
//   - emoji  -> o próprio caractere, ex.: "🏠"  (como já era antes)
//   - vetor  -> "lucide:<Nome>", ex.: "lucide:Home"  (biblioteca lucide-react)
//   - imagem -> uma URL "http(s)://..." (upload do usuário); vira miniatura
// =====================================================================

import {
  Home,
  Building2,
  Factory,
  Trees,
  Mountain,
  Tractor,
  Wrench,
  Hammer,
  Settings,
  Cog,
  HardHat,
  Sprout,
  Wheat,
  Droplet,
  Flame,
  Zap,
  Sun,
  CloudRain,
  Snowflake,
  Check,
  CircleCheck,
  Star,
  Heart,
  DollarSign,
  ShoppingCart,
  Package,
  Rocket,
  Target,
  ThumbsUp,
  Smile,
  TrendingUp,
  Trophy,
  Phone,
  MessageCircle,
  Truck,
  Leaf,
  Shield,
  Clock,
  MapPin,
  Gift,
  Tag,
  Award,
  Users,
  Car,
  Bell,
  Camera,
  Play,
  Sparkles,
  CircleHelp,
  // ---- Ícones adicionais ----
  Wallet,
  CreditCard,
  Calendar,
  ShoppingBag,
  Store,
  Boxes,
  Ruler,
  Scissors,
  Lightbulb,
  ThumbsDown,
  Headphones,
  Mail,
  Globe,
  Lock,
  Search,
  Settings2,
  Percent,
  BadgeCheck,
  Flag,
  Bookmark,
  ChevronRight,
  Plus,
  Minus,
  X,
  Info,
  Eye,
  TreePine,
  Wind,
  Waves,
  Recycle,
  Battery,
  Plug,
  ShieldCheck,
  Timer,
  Crown,
  Gem,
  Wifi,
  Smartphone,
  Monitor,
  Coffee,
  Utensils,
  Pizza,
  ShowerHead,
  Bath,
  Bed,
  Sofa,
  Dog,
  Cat,
  Bird,
  Fish,
  Bike,
  Plane,
  Ship,
  Fuel,
  PaintBucket,
  Brush,
  Key,
  Map,
  Navigation,
  Compass,
  Music,
  Video,
  Image as ImageIcon,
  FileText,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Pill,
  Activity,
  Dumbbell,
  Baby,
  Flower2,
  Apple,
  Carrot,
  Egg,
  Milk,
  type LucideIcon,
} from "lucide-react";

// Prefixo que identifica um ícone vetorial no campo `icon`.
export const LUCIDE_PREFIX = "lucide:";

// Conjunto curado de ícones vetoriais oferecidos no admin.
export const LUCIDE_ICONS: Record<string, LucideIcon> = {
  Home,
  Building2,
  Factory,
  Trees,
  Mountain,
  Tractor,
  Wrench,
  Hammer,
  Settings,
  Cog,
  HardHat,
  Sprout,
  Wheat,
  Droplet,
  Flame,
  Zap,
  Sun,
  CloudRain,
  Snowflake,
  Check,
  CircleCheck,
  Star,
  Heart,
  DollarSign,
  ShoppingCart,
  Package,
  Rocket,
  Target,
  ThumbsUp,
  Smile,
  TrendingUp,
  Trophy,
  Phone,
  MessageCircle,
  Truck,
  Leaf,
  Shield,
  Clock,
  MapPin,
  Gift,
  Tag,
  Award,
  Users,
  Car,
  Bell,
  Camera,
  Play,
  Sparkles,
  CircleHelp,
  // ---- Ícones adicionais ----
  Wallet,
  CreditCard,
  Calendar,
  ShoppingBag,
  Store,
  Boxes,
  Ruler,
  Scissors,
  Lightbulb,
  ThumbsDown,
  Headphones,
  Mail,
  Globe,
  Lock,
  Search,
  Settings2,
  Percent,
  BadgeCheck,
  Flag,
  Bookmark,
  ChevronRight,
  Plus,
  Minus,
  X,
  Info,
  Eye,
  TreePine,
  Wind,
  Waves,
  Recycle,
  Battery,
  Plug,
  ShieldCheck,
  Timer,
  Crown,
  Gem,
  Wifi,
  Smartphone,
  Monitor,
  Coffee,
  Utensils,
  Pizza,
  ShowerHead,
  Bath,
  Bed,
  Sofa,
  Dog,
  Cat,
  Bird,
  Fish,
  Bike,
  Plane,
  Ship,
  Fuel,
  PaintBucket,
  Brush,
  Key,
  Map,
  Navigation,
  Compass,
  Music,
  Video,
  ImageIcon,
  FileText,
  Briefcase,
  GraduationCap,
  Stethoscope,
  Pill,
  Activity,
  Dumbbell,
  Baby,
  Flower2,
  Apple,
  Carrot,
  Egg,
  Milk,
};

// Nomes (na ordem do objeto) para o seletor do admin montar a grade.
export const LUCIDE_NAMES = Object.keys(LUCIDE_ICONS);

// Diz se o valor do ícone é uma imagem (URL enviada pelo usuário).
export function isImageIcon(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

type Props = {
  value: string | null | undefined;
  // Tamanho do ícone vetorial em px (emoji acompanha via font-size na classe).
  size?: number;
  className?: string;
};

export default function OptionIcon({ value, size = 24, className }: Props) {
  if (!value) return null;

  // Imagem enviada pelo usuário: miniatura quadrada com cantos arredondados.
  if (isImageIcon(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt=""
        aria-hidden
        style={{ width: size, height: size }}
        className={`shrink-0 rounded-md object-cover ${className ?? ""}`}
      />
    );
  }

  // Ícone vetorial (lucide).
  if (value.startsWith(LUCIDE_PREFIX)) {
    const name = value.slice(LUCIDE_PREFIX.length);
    const Icon = LUCIDE_ICONS[name];
    if (!Icon) return null;
    return <Icon size={size} className={className} aria-hidden />;
  }

  // Emoji (texto puro).
  return <span className={className}>{value}</span>;
}
