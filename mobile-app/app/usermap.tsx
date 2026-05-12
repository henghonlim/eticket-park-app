import { Stack } from 'expo-router';
import React from 'react';
import UserMapScreen from '../src/screens/UserMapScreen'; 

export default function UserMapRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <UserMapScreen key={Date.now()} />
    </>
  );
}