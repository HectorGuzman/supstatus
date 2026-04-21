import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Gradient as LinearGradient } from '../components/Gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ForecastScreen from '../screens/ForecastScreen';
import SessionsScreen from '../screens/SessionsScreen';
import StoriesScreen from '../screens/StoriesScreen';
import ProfileScreen from '../screens/ProfileScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { colors } from '../theme';
import { auth } from '../services/firebase';

const Tab = createBottomTabNavigator();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, { active: IoniconsName; inactive: IoniconsName }> = {
  Condiciones: { active: 'water',        inactive: 'water-outline' },
  Remadas:     { active: 'navigate',     inactive: 'navigate-outline' },
  Historias:   { active: 'images',       inactive: 'images-outline' },
  Perfil:      { active: 'person',       inactive: 'person-outline' },
};

function TabIcon({ name, focused }: { name: string; focused: boolean }) {
  const icons = TAB_ICONS[name];
  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperActive]}>
      {focused && <View style={styles.iconGlow} />}
      <Ionicons
        name={focused ? icons.active : icons.inactive}
        size={22}
        color={focused ? colors.primary : colors.textMuted}
      />
    </View>
  );
}

function LoadingSplash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

export default function Navigation() {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<any>((auth as any).currentUser);
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const unsub = (auth as any).onAuthStateChanged((u: any) => {
      setUser(u);
      setAuthLoaded(true);
    });
    return unsub;
  }, []);

  if (!authLoaded) return <LoadingSplash />;
  if (!user) {
    return (
      <NavigationContainer>
        <WelcomeScreen />
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 4 },
          tabBarStyle: [styles.tabBar, { height: 60 + insets.bottom, paddingBottom: insets.bottom }],
          tabBarBackground: () => (
            <LinearGradient
              colors={['rgba(4,14,30,0.95)', 'rgba(7,24,40,0.98)']}
              style={StyleSheet.absoluteFill}
            />
          ),
          tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        })}
      >
        <Tab.Screen name="Condiciones" component={ForecastScreen} />
        <Tab.Screen name="Remadas" component={SessionsScreen} />
        <Tab.Screen name="Historias" component={StoriesScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}


const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: 'rgba(14,165,233,0.1)',
    paddingTop: 8,
    backgroundColor: 'transparent',
    elevation: 20,
  },
  iconWrapper: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  iconWrapperActive: {
    backgroundColor: 'rgba(14,165,233,0.1)',
  },
  iconGlow: {
    position: 'absolute',
    width: 40,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(14,165,233,0.08)',
  },
});
