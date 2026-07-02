import React from 'react';
import { 
  Calendar, RefreshCw, Package, Link, CheckCircle, 
  Megaphone, Award, DollarSign, FileText, BarChart, 
  Cpu, Palette, Star, Users, Clock, Zap, TrendingUp
} from 'lucide-react';

const ICON_MAP = {
  'calendar': Calendar,
  'refresh': RefreshCw,
  'package': Package,
  'link': Link,
  'check': CheckCircle,
  'megaphone': Megaphone,
  'award': Award,
  'party': Award, // Alternative for party-popper
  'dollar': DollarSign,
  'file': FileText,
  'chart': BarChart,
  'cpu': Cpu,
  'bot': Cpu,
  'palette': Palette,
  'star': Star,
  'users': Users,
  'clock': Clock,
  'zap': Zap,
  'trend': TrendingUp
};

export function ProfIcon({ icon, size = 18, color = 'var(--teal)', variant = 'transparent', style = {} }) {
  const IconComponent = ICON_MAP[icon] || Zap; // Default to Zap if not found
  
  const containerStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0,
    ...style
  };

  if (variant === 'transparent') {
    containerStyle.background = 'rgba(26, 184, 160, 0.1)';
    containerStyle.border = '1px solid rgba(26, 184, 160, 0.15)';
    containerStyle.width = size * 1.8 + 'px';
    containerStyle.height = size * 1.8 + 'px';
  }

  return (
    <div className="prof-icon-container" style={containerStyle}>
      <IconComponent size={size} color={color} />
    </div>
  );
}
