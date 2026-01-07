import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ThreadsScreen from '../screens/main/ThreadsScreen';
import MeetingsScreen from '../screens/main/MeetingsScreen';
import ResourcesScreen from '../screens/main/ResourcesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import LeaderResourcesScreen from '../screens/leader/LeaderResourcesScreen';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
    <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
  </View>
);

export default function MainNavigator() {
  const { isLeader } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Threads"
        component={ThreadsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="💬" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Meetings"
        component={MeetingsScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📅" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Resources"
        component={ResourcesScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="📚" focused={focused} />,
        }}
      />
      {isLeader && (
        <Tab.Screen
          name="LeaderHub"
          component={LeaderResourcesScreen}
          options={{
            tabBarLabel: 'Leader Hub',
            tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} />,
          }}
        />
      )}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1E293B',
    borderTopColor: '#334155',
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  iconContainer: {
    padding: 8,
    borderRadius: 12,
  },
  iconContainerActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  icon: {
    fontSize: 22,
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
});


