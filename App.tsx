import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './src/contexts/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import { Platform } from 'react-native';

const linking = {
  prefixes: ['http://localhost:8081', 'leaderapp://'],
  config: {
    screens: {
      Auth: {
        screens: {
          SignIn: 'sign-in',
          SignUp: 'sign-up',
        },
      },
      Main: {
        screens: {
          Threads: 'threads',
          Meetings: 'meetings',
          Resources: 'resources',
          LeaderHub: 'leader-hub',
          Profile: 'profile',
        },
      },
    },
  },
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer 
        linking={Platform.OS === 'web' ? linking : undefined}
        documentTitle={{
          formatter: () => 'Leader App',
        }}
      >
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
