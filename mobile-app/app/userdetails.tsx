import { Stack } from 'expo-router';
import React from 'react';
import UserDetailsScreen from '../src/screens/UserDetailsScreen'; 

export default function UserDetailsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <UserDetailsScreen />
    </>
  );
}