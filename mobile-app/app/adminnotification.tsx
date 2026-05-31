import { Stack } from 'expo-router';
import React from 'react';
import AdminNotificationScreen from '../src/screens/AdminNotificationScreen';

export default function AdminNotificationRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminNotificationScreen />
    </>
  );
}