import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import React from 'react';
import { Platform } from 'react-native';

// Passes dither={false} explicitly on Android to avoid a Fabric new-arch bug
// where an undefined dither prop gets serialised as a String instead of Boolean.
export function Gradient(props: LinearGradientProps) {
  return <LinearGradient {...props} dither={Platform.OS === 'android' ? false : undefined} />;
}
