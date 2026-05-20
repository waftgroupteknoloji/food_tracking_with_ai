import { Redirect, Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useAuthStore } from '@/lib/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { C } from '@/lib/theme';

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'unauthed') return <Redirect href="/(auth)/login" />;
  if (status === 'idle' || status === 'loading') return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.lime,
        tabBarInactiveTintColor: C.text3,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopWidth: 1,
          borderTopColor: C.border2,
          height: Platform.select({ ios: 84, android: 64 }),
          paddingTop: 6,
          paddingBottom: Platform.select({ ios: 26, android: 8 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
        sceneStyle: { backgroundColor: C.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Bugün',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="gunluk"
        options={{
          title: 'Günlük',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Ekle',
          tabBarIcon: ({ size }) => (
            <Ionicons name="add-circle" size={size + 10} color={C.lime} />
          ),
        }}
      />
      <Tabs.Screen
        name="weight"
        options={{
          title: 'Kilo',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scale-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
