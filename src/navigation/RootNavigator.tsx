import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useGroup } from '../contexts/GroupContext';
import AuthNavigator from './AuthNavigator';
import DrawerNavigator from './DrawerNavigator';
import GroupSelectScreen from '../screens/group/GroupSelectScreen';
import ConfirmReminderScreen from '../screens/ConfirmReminderScreen';
import { RootStackParamList } from './types';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { currentGroup, groups, loading: groupLoading } = useGroup();

  if (authLoading || (session && groupLoading)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Not logged in
  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthNavigator} />
      </Stack.Navigator>
    );
  }

  // Logged in - ConfirmReminder is available regardless of group selection
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!currentGroup ? (
        <Stack.Screen name="GroupSelect" component={GroupSelectScreen} />
      ) : (
        <Stack.Screen name="Main" component={DrawerNavigator} />
      )}
      <Stack.Screen name="ConfirmReminder" component={ConfirmReminderScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
