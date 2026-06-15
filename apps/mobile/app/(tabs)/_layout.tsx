import { Redirect, Tabs } from 'expo-router';
import { Pressable, Text, View, Platform } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuthStore } from '@/lib/auth-store';
import { isProfileComplete } from '@/lib/profile';
import { Ionicons } from '@expo/vector-icons';
import { C, onPrimary } from '@/lib/theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

const TAB_META: Record<
  string,
  { label: string; icon: IoniconName; fab?: boolean }
> = {
  index: { label: 'Bugün', icon: 'home-outline' },
  gunluk: { label: 'Günlük', icon: 'time-outline' },
  add: { label: '', icon: 'camera', fab: true },
  weight: { label: 'Kilo', icon: 'scale-outline' },
  profile: { label: 'Profil', icon: 'person-outline' },
};

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 14,
        paddingTop: 10,
        paddingBottom: Platform.select({ ios: 22, android: 12, default: 12 }),
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        backgroundColor: 'rgba(20, 23, 30, 0.96)',
        borderTopWidth: 1,
        borderTopColor: C.border2,
      }}
    >
      {state.routes.map((route, idx) => {
        const meta = TAB_META[route.name];
        if (!meta) return null;
        const focused = state.index === idx;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        if (meta.fab) {
          const SIZE = 64;
          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [
                {
                  width: SIZE,
                  height: SIZE,
                  borderRadius: 999,
                  marginTop: -28,
                  shadowColor: C.lime,
                  shadowOpacity: 0.7,
                  shadowOffset: { width: 0, height: 10 },
                  shadowRadius: 22,
                  elevation: 14,
                },
                pressed && { opacity: 0.92, transform: [{ scale: 0.96 }] },
              ]}
            >
              <LinearGradient
                colors={['#e4ff8a', '#b8f04d', '#9bd03a']}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: SIZE,
                  height: SIZE,
                  borderRadius: 999,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 2,
                  borderColor: 'rgba(255,255,255,0.55)',
                }}
              >
                <Ionicons name={meta.icon} size={28} color={onPrimary} />
              </LinearGradient>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              paddingVertical: 4,
            }}
          >
            <Ionicons
              name={meta.icon}
              size={22}
              color={focused ? C.lime : C.text3}
            />
            <Text
              style={{
                fontSize: 10.5,
                fontWeight: '600',
                color: focused ? C.lime : C.text3,
              }}
            >
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  if (status === 'unauthed') return <Redirect href="/(auth)/login" />;
  if (status === 'idle' || status === 'loading') return null;
  if (!isProfileComplete(user)) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="gunluk" />
      <Tabs.Screen name="add" />
      <Tabs.Screen name="weight" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
