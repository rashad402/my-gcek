import { ThemeColors } from '@/constants/theme';

export type StatusTier = 'success' | 'warning' | 'danger';

export function getStatusTier(percentage: number, targetPercentage: number): StatusTier {
  if (percentage >= targetPercentage) return 'success';
  if (percentage >= targetPercentage - 5) return 'warning';
  return 'danger';
}

export function getStatusColor(percentage: number, targetPercentage: number, colors: ThemeColors): string {
  const tier = getStatusTier(percentage, targetPercentage);
  if (tier === 'success') return colors.success;
  if (tier === 'warning') return colors.warning;
  return colors.danger;
}
