import { Stack } from 'expo-router';
import React from 'react';
import TicketManageScreen from '../src/screens/TicketManageScreen';

export default function TicketManageRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <TicketManageScreen />
    </>
  );
}