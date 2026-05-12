import { Stack } from 'expo-router';
import React from 'react';
import MyTicketsScreen from '../src/screens/MyTicketsScreen'; 

export default function MyTicketsRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <MyTicketsScreen />
    </>
  );
}