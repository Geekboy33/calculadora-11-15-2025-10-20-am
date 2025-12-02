/**
 * Custom Icons Component
 * Iconos personalizados acordes al diseño del sistema DAES
 * Reemplaza emojis con iconos SVG profesionales
 */

import { Building2, Shield, Scale, Award, CheckCircle2, XCircle, RefreshCw, Lightbulb, AlertTriangle, BarChart3, DollarSign, Target, Rocket, Lock, Globe, Database } from 'lucide-react';

interface IconProps {
  className?: string;
  size?: number;
}

/**
 * Icono de Banco (reemplaza 🏦)
 */
export function BankIcon({ className = '', size = 20 }: IconProps) {
  return <Building2 className={className} size={size} />;
}

/**
 * Icono de Blockchain/Globo (reemplaza 🌐)
 */
export function BlockchainIcon({ className = '', size = 20 }: IconProps) {
  return <Globe className={className} size={size} />;
}

/**
 * Icono de Seguridad (reemplaza 🔒)
 */
export function SecurityIcon({ className = '', size = 20 }: IconProps) {
  return <Lock className={className} size={size} />;
}

/**
 * Icono de Justicia/Compliance (reemplaza ⚖️)
 */
export function ComplianceIcon({ className = '', size = 20 }: IconProps) {
  return <Scale className={className} size={size} />;
}

/**
 * Icono de Premio/Estándar (reemplaza 🥇)
 */
export function AwardIcon({ className = '', size = 20 }: IconProps) {
  return <Award className={className} size={size} />;
}

/**
 * Icono de Check/Verificado (reemplaza ✓ o ✅)
 */
export function CheckIcon({ className = '', size = 20 }: IconProps) {
  return <CheckCircle2 className={className} size={size} />;
}

/**
 * Icono de Error (reemplaza ❌)
 */
export function ErrorIcon({ className = '', size = 20 }: IconProps) {
  return <XCircle className={className} size={size} />;
}

/**
 * Icono de Refresh (reemplaza 🔄)
 */
export function RefreshIcon({ className = '', size = 20 }: IconProps) {
  return <RefreshCw className={className} size={size} />;
}

/**
 * Icono de Idea (reemplaza 💡)
 */
export function IdeaIcon({ className = '', size = 20 }: IconProps) {
  return <Lightbulb className={className} size={size} />;
}

/**
 * Icono de Alerta (reemplaza ⚠️)
 */
export function AlertIcon({ className = '', size = 20 }: IconProps) {
  return <AlertTriangle className={className} size={size} />;
}

/**
 * Icono de Gráfico/Estadísticas (reemplaza 📊)
 */
export function ChartIcon({ className = '', size = 20 }: IconProps) {
  return <BarChart3 className={className} size={size} />;
}

/**
 * Icono de Dinero (reemplaza 💰)
 */
export function MoneyIcon({ className = '', size = 20 }: IconProps) {
  return <DollarSign className={className} size={size} />;
}

/**
 * Icono de Objetivo (reemplaza 🎯)
 */
export function TargetIcon({ className = '', size = 20 }: IconProps) {
  return <Target className={className} size={size} />;
}

/**
 * Icono de Cohete (reemplaza 🚀)
 */
export function RocketIcon({ className = '', size = 20 }: IconProps) {
  return <Rocket className={className} size={size} />;
}

/**
 * Icono de Base de Datos (reemplaza 📊 en algunos contextos)
 */
export function DatabaseIcon({ className = '', size = 20 }: IconProps) {
  return <Database className={className} size={size} />;
}

/**
 * Función helper para obtener texto de icono en modo texto (para TXT)
 */
export const IconText = {
  bank: '[BANK]',
  blockchain: '[BLOCKCHAIN]',
  security: '[SECURITY]',
  compliance: '[COMPLIANCE]',
  award: '[AWARD]',
  check: '[VERIFIED]',
  error: '[ERROR]',
  refresh: '[REFRESH]',
  idea: '[INFO]',
  alert: '[WARNING]',
  chart: '[CHART]',
  money: '[MONEY]',
  target: '[TARGET]',
  rocket: '[ROCKET]',
  database: '[DATABASE]',
};

