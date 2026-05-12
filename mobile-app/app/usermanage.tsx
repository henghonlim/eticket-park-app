import { Stack } from 'expo-router';
import React from 'react';
import UserManageScreen from '../src/screens/UserManageScreen';

export default function UserManageRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <UserManageScreen />
    </>
  );
}