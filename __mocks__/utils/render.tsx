/**
 * Render Utilities - Centralized test rendering with all providers
 *
 * Usage:
 * import { renderWithProviders } from '@/__mocks__/utils/render';
 *
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

/**
 * Wrapper that provides all necessary context for testing
 * SafeAreaProvider and Navigation are globally mocked in jest.setup.js
 */
export const AllProviders: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NavigationContainer>
      {children}
    </NavigationContainer>
  );
};

/**
 * Render a component wrapped with all providers
 *
 * @example
 * ```tsx
 * const { getByText } = renderWithProviders(<MeetingsScreen />);
 * expect(getByText('Events')).toBeTruthy();
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: AllProviders, ...options });
}

/**
 * Navigation wrapper only (when full providers aren't needed)
 */
export const NavigationWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <NavigationContainer>
      {children}
    </NavigationContainer>
  );
};

/**
 * Render with navigation context only
 */
export function renderWithNavigation(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
): RenderResult {
  return render(ui, { wrapper: NavigationWrapper, ...options });
}

/**
 * Create a custom render function with specific wrappers
 *
 * @example
 * ```tsx
 * const customRender = createCustomRender(({ children }) => (
 *   <ThemeProvider theme="dark">{children}</ThemeProvider>
 * ));
 *
 * const { getByText } = customRender(<MyComponent />);
 * ```
 */
export function createCustomRender(
  Wrapper: React.FC<{ children: ReactNode }>
): (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) => RenderResult {
  return (ui, options) => render(ui, { wrapper: Wrapper, ...options });
}
