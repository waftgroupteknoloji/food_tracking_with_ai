import { Redirect, Tabs } from 'expo-router';
import { useAuthStore } from '@/lib/auth-store';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@yemek-takip/ui-tokens';

export default function TabsLayout() {
  const status = useAuthStore((s) => s.status);
  if (status === 'unauthed') return <Redirect href="/(auth)/login" />;
  if (status === 'idle' || status === 'loading') return null;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: '#9ca3af',
        tabBarStyle: {
          borderTopWidth: 1,
        },
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
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle" size={size + 8} color={colors.accent[500]} />
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
