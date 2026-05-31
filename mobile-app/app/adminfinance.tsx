import { Stack } from 'expo-router';
import React from 'react';
import AdminFinanceScreen from '../src/screens/AdminFinanceScreen';

export default function AdminFinanceRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <AdminFinanceScreen />
    </>
  );
}