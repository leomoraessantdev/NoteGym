import { memo } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

/** Um ícone por aba. O nome casa com a rota em `app/(tabs)`. */
export type TabIconName = 'index' | 'treinos' | 'calendario' | 'progresso' | 'perfil';

type Props = {
  name: TabIconName;
  color: string;
  size?: number;
};

/**
 * Ícones desenhados à mão, no mesmo traço do resto do app (stroke 2, pontas
 * redondas) — evita puxar uma fonte de ícones só para cinco glifos.
 */
export const TabIcon = memo(function TabIcon({ name, color, size = 24 }: Props) {
  const common = {
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {name === 'index' && (
        <>
          <Path d="M3.5 10.5 12 4l8.5 6.5" {...common} />
          <Path d="M5.5 9.5V20h13V9.5" {...common} />
          <Path d="M10 20v-4.5h4V20" {...common} />
        </>
      )}

      {name === 'treinos' && (
        <>
          <Path d="M7 12h10" {...common} />
          <Path d="M4.5 9.2v5.6M7.5 7.8v8.4" {...common} />
          <Path d="M16.5 7.8v8.4M19.5 9.2v5.6" {...common} />
        </>
      )}

      {name === 'calendario' && (
        <>
          <Path d="M4.5 6.5h15v13h-15z" {...common} />
          <Path d="M4.5 10.5h15" {...common} />
          <Path d="M8.5 4v4M15.5 4v4" {...common} />
        </>
      )}

      {name === 'progresso' && (
        <>
          <Path d="M4 19V5M4 19h16" {...common} />
          <Path d="m7 15 3.5-4 3 2.5L20 7" {...common} />
          <Path d="M20 11V7h-4" {...common} />
        </>
      )}

      {name === 'perfil' && (
        <>
          <Circle cx={12} cy={8} r={3.5} {...common} />
          <Path d="M5.5 20a6.5 6.5 0 0 1 13 0" {...common} />
        </>
      )}
    </Svg>
  );
});
