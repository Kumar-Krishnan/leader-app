import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, TextStyle } from 'react-native';

/**
 * Props for the Avatar component
 */
interface AvatarProps {
  /** URL to the user's profile image */
  uri?: string | null;
  /** User's full name (used to generate initials) */
  name?: string | null;
  /** Avatar diameter in pixels (default: 40) */
  size?: number;
  /** Additional container styles */
  style?: ViewStyle;
  /** Additional text styles for initials */
  textStyle?: TextStyle;
}

/**
 * Reusable Avatar component that displays a user's profile picture.
 * Falls back to displaying initials on a colored background if:
 * - No image URL is provided
 * - The image fails to load
 *
 * @example
 * ```tsx
 * // With image
 * <Avatar uri={user.avatar_url} name={user.full_name} size={48} />
 *
 * // Initials fallback
 * <Avatar name="John Doe" size={36} />
 * ```
 */
export default function Avatar({ uri, name, size = 40, style, textStyle }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  
  // Get initials from name (up to 2 characters)
  const getInitials = (): string => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  // Calculate font size based on avatar size
  const fontSize = Math.floor(size * 0.4);
  
  const containerStyle: ViewStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    ...style,
  };

  // Show image if URI exists and hasn't errored
  if (uri && !imageError) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, containerStyle]}
        onError={() => setImageError(true)}
      />
    );
  }

  // Fallback to initials
  return (
    <View style={[styles.fallback, containerStyle]}>
      <Text style={[styles.initials, { fontSize }, textStyle]}>
        {getInitials()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#334155',
  },
  fallback: {
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
});

