import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet } from 'react-native';
import { useGroup } from '../contexts/GroupContext';
import ThreadsScreen from '../screens/main/ThreadsScreen';
import ThreadDetailScreen from '../screens/main/ThreadDetailScreen';
import ManageMembersScreen from '../screens/group/ManageMembersScreen';
import MeetingsScreen from '../screens/main/MeetingsScreen';
import ResourcesScreen from '../screens/main/ResourcesScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import LeaderResourcesScreen from '../screens/leader/LeaderResourcesScreen';
import { MainTabParamList } from './types';
import { colors, spacing, borderRadius, fontSize, fontWeight } from '../constants/theme';

const ThreadsStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<MainTabParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.card.background },
  headerTintColor: colors.text.primary,
  headerTitleStyle: { fontWeight: fontWeight.semibold },
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
  const { canApproveRequests } = useGroup();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.tertiary,
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
        name="MemberHub"
        component={ResourcesScreen}
        options={{
          tabBarLabel: 'Member Hub',
          tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} />,
        }}
      />
      {canApproveRequests && (
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
    backgroundColor: colors.card.background,
    borderTopColor: colors.border.light,
    borderTopWidth: 1,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    height: 70,
  },
  tabLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginTop: spacing.xs,
  },
  iconContainer: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  iconContainerActive: {
    backgroundColor: colors.accent.light,
  },
  icon: {
    fontSize: 22,
  },
  iconActive: {
    transform: [{ scale: 1.1 }],
  },
});
