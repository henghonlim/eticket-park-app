import { Stack } from 'expo-router';
import React from 'react';
import NotificationScreen from '../src/screens/NotificationScreen';

export default function NotificationRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <NotificationScreen />
    </>
  );
}