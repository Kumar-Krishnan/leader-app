import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useParish } from '../contexts/ParishContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import ParishSelectScreen from '../screens/parish/ParishSelectScreen';
import { RootStackParamList } from './types';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const { currentParish, parishes, loading: parishLoading } = useParish();

  if (authLoading || (session && parishLoading)) {
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

  // Logged in but no parish selected (or no parishes)
  if (!currentParish) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="ParishSelect" component={ParishSelectScreen} />
      </Stack.Navigator>
    );
  }

  // Logged in with parish selected
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainNavigator} />
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
