import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from './src/contexts/AuthContext';
import { GroupProvider } from './src/contexts/GroupContext';
import RootNavigator from './src/navigation/RootNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { logger } from './src/lib/logger';

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
          MainTabs: {
            screens: {
              Threads: {
                screens: {
                  ThreadsList: 'threads',
                  ThreadDetail: 'thread/:threadId',
                },
              },
              Meetings: 'meetings',
              MemberHub: 'member-hub',
              LeaderHub: 'leader-hub',
              Profile: {
                screens: {
                  ProfileMain: 'profile',
                  ManageMembers: 'manage-members',
                },
              },
            },
          },
        },
      },
    },
  },
};

/**
 * Handle errors caught by the ErrorBoundary
 * In production, this would send to a monitoring service like Sentry
 */
function handleError(error: Error, errorInfo: React.ErrorInfo): void {
  logger.error('App', 'Unhandled error caught by ErrorBoundary', {
    error: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
  });

  // TODO: Send to monitoring service in production
  // if (!__DEV__) {
  //   Sentry.captureException(error, { extra: errorInfo });
  // }
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary onError={handleError}>
        <AuthProvider>
          <GroupProvider>
            <NavigationContainer
              linking={Platform.OS === 'web' ? linking : undefined}
              documentTitle={{
                formatter: () => 'Leader App',
              }}
            >
              <StatusBar style="light" />
              <RootNavigator />
            </NavigationContainer>
          </GroupProvider>
        </AuthProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
