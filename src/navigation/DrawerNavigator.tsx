import React from 'react';
import { useWindowDimensions, Platform } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainNavigator from './MainNavigator';
import GroupSidebar from '../components/GroupSidebar';
import { DrawerParamList } from './types';
import { colors } from '../constants/theme';

const Drawer = createDrawerNavigator<DrawerParamList>();

// Breakpoint for persistent sidebar (web only)
const SIDEBAR_BREAKPOINT = 768;

export default function DrawerNavigator() {
  const { width } = useWindowDimensions();

  // On web with wide screens, show persistent sidebar
  // On mobile or narrow screens, use overlay drawer
  const isWideScreen = Platform.OS === 'web' && width >= SIDEBAR_BREAKPOINT;

  return (
    <Drawer.Navigator
      drawerContent={(props) => <GroupSidebar {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: isWideScreen ? 'permanent' : 'front',
        drawerStyle: {
          width: isWideScreen ? 280 : 300,
          backgroundColor: colors.background.primary,
        },
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        swipeEnabled: Platform.OS !== 'web',
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen name="MainTabs" component={MainNavigator} />
    </Drawer.Navigator>
  );
}
