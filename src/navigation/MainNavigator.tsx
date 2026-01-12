import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import ThreadsScreen from '../screens/main/ThreadsScreen';
import ThreadDetailScreen from '../screens/main/ThreadDetailScreen';
import ManageMembersScreen from '../screens/group/ManageMembersScreen';
import MeetingsScreen from '../screens/main/MeetingsScreen';
import ResourcesScreen from '../screens/main/ResourcesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import LeaderResourcesScreen from '../screens/leader/LeaderResourcesScreen';
import { MainTabParamList } from './types';

const ThreadsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<MainTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: '#1E293B' },
  headerTintColor: '#F8FAFC',
  headerTitleStyle: { fontWeight: '600' as const },
};

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
    <Text style={[styles.icon, focused && styles.iconActive]}>{icon}</Text>
  </View>
);

// Threads tab with its own stack for thread details
function ThreadsStackScreen() {
  return (
    <ThreadsStack.Navigator screenOptions={stackScreenOptions}>
      <ThreadsStack.Screen 
        name="ThreadsList" 
        component={ThreadsScreen}
        options={{ headerShown: false }}
      />
      <ThreadsStack.Screen
        name="ThreadDetail"
        component={ThreadDetailScreen}
        options={{ title: 'Thread' }}
      />
    </ThreadsStack.Navigator>
  );
}

// Profile tab with its own stack for manage members
function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator screenOptions={stackScreenOptions}>
      <ProfileStack.Screen 
        name="ProfileMain" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
      <ProfileStack.Screen
        name="ManageMembers"
        component={ManageMembersScreen}
        options={{ title: 'Manage Members' }}
      />
    </ProfileStack.Navigator>
  );
}

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
        component={ThreadsStackScreen}
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
        component={ProfileStackScreen}
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
