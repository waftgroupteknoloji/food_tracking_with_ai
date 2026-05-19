import { View, Text } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface Props {
  kcalIn: number;
  kcalOut: number;
  target: number | null;
  size?: number;
}

export function CalorieRing({ kcalIn, kcalOut, target, size = 200 }: Props) {
  const stroke = 14;
  const radiusOuter = (size - stroke) / 2;
  const radiusInner = radiusOuter - stroke - 4;
  const circumferenceOuter = 2 * Math.PI * radiusOuter;
  const circumferenceInner = 2 * Math.PI * radiusInner;

  const targetVal = target ?? Math.max(kcalIn, 2000);
  const inPct = Math.min(kcalIn / targetVal, 1.25);
  const outTarget = targetVal * 0.3;
  const outPct = Math.min(kcalOut / Math.max(outTarget, 1), 1.25);

  const net = kcalIn - kcalOut;
  const remaining = target ? target - net : null;

  return (
    <View className="items-center justify-center">
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusOuter}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusOuter}
            fill="none"
            stroke="#16a34a"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumferenceOuter}
            strokeDashoffset={circumferenceOuter * (1 - inPct)}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusInner}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={stroke}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radiusInner}
            fill="none"
            stroke="#f97316"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumferenceInner}
            strokeDashoffset={circumferenceInner * (1 - outPct)}
          />
        </G>
      </Svg>
      <View
        style={{ position: 'absolute' }}
        className="items-center"
      >
        <Text className="text-xs uppercase text-neutral-500">Net</Text>
        <Text className="text-4xl font-bold text-neutral-900 dark:text-neutral-100">
          {net}
        </Text>
        <Text className="text-xs text-neutral-500">kcal</Text>
        {target && remaining !== null && (
          <Text
            className={`mt-1 text-xs font-medium ${
              remaining >= 0 ? 'text-primary-600' : 'text-accent-500'
            }`}
          >
            {remaining >= 0
              ? `${remaining} kcal kaldı`
              : `${Math.abs(remaining)} üzeri`}
          </Text>
        )}
      </View>
    </View>
  );
}
