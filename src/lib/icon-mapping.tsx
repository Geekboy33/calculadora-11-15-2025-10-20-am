/**
 * Icon Mapping - Sistema de Íconos Consistente
 * Mapeo de emojis a íconos de Lucide React
 */

import {
  DollarSign,
  TrendingUp,
  BarChart3,
  Globe,
  Lock,
  Building2,
  Zap,
  HardDrive,
  Shield,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  FileText,
  Eye,
  Download,
  Upload,
  Settings,
  Users,
  Key,
  Database,
  Server,
  Cpu,
  Activity,
  Wallet,
  CreditCard,
  type LucideIcon
} from 'lucide-react';

/**
 * Mapeo de nombres semánticos a íconos de Lucide
 */
export const IconMap = {
  // Financieros
  money: DollarSign,
  trending: TrendingUp,
  chart: BarChart3,
  wallet: Wallet,
  creditCard: CreditCard,

  // Seguridad
  lock: Lock,
  shield: Shield,
  key: Key,

  // Sistema
  globe: Globe,
  world: Globe,
  building: Building2,
  bank: Building2,

  // Rendimiento
  speed: Zap,
  lightning: Zap,
  activity: Activity,
  cpu: Cpu,

  // Almacenamiento
  storage: HardDrive,
  database: Database,
  server: Server,

  // Estados
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,

  // Acciones
  view: Eye,
  download: Download,
  upload: Upload,
  settings: Settings,

  // Usuarios
  users: Users,

  // Documentos
  document: FileText,
} as const;

/**
 * Tipo para las claves del mapeo
 */
export type IconName = keyof typeof IconMap;

/**
 * Componente de ícono reutilizable con estilos de la plataforma
 */
interface PlatformIconProps {
  name: IconName;
  className?: string;
  size?: number;
}

export function PlatformIcon({ name, className = '', size = 20 }: PlatformIconProps) {
  const Icon = IconMap[name];

  return (
    <Icon
      className={`text-[#00ff88] ${className}`}
      size={size}
    />
  );
}

/**
 * Componente de badge con ícono
 */
interface IconBadgeProps {
  icon: IconName;
  label: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md' | 'lg';
}

export function IconBadge({ icon, label, variant = 'default', size = 'md' }: IconBadgeProps) {
  const Icon = IconMap[icon];

  const variantStyles = {
    default: 'bg-[#0d0d0d] border-[#00ff88]/30 text-[#00ff88]',
    success: 'bg-green-900/20 border-green-700/50 text-green-400',
    warning: 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400',
    error: 'bg-red-900/20 border-red-700/50 text-red-400',
    info: 'bg-blue-900/20 border-blue-700/50 text-blue-400',
  };

  const sizeStyles = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  return (
    <div className={`inline-flex items-center gap-1.5 border rounded-lg font-semibold ${variantStyles[variant]} ${sizeStyles[size]}`}>
      <Icon size={iconSizes[size]} />
      <span>{label}</span>
    </div>
  );
}

/**
 * Componente de KPI Card con ícono
 */
interface KPICardProps {
  icon: IconName;
  label: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
}

export function KPICard({ icon, label, value, change, trend }: KPICardProps) {
  const Icon = IconMap[icon];

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend === 'down') return <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />;
    return <Activity className="w-4 h-4 text-gray-400" />;
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-6 hover:border-[#00ff88]/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-[#00ff88]/10 rounded-lg">
          <Icon className="w-6 h-6 text-[#00ff88]" />
        </div>
        {trend && getTrendIcon()}
      </div>

      <div className="space-y-1">
        <div className="text-sm text-[#4d7c4d]">{label}</div>
        <div className="text-3xl font-bold text-[#e0ffe0]">{value}</div>
        {change && (
          <div className={`text-sm font-semibold ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
            {change}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Utilidad para obtener ícono por nombre
 */
export function getIcon(name: IconName): LucideIcon {
  return IconMap[name];
}

/**
 * Lista de todos los íconos disponibles (útil para documentación)
 */
export const availableIcons = Object.keys(IconMap) as IconName[];
