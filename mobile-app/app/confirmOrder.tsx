import { Stack } from 'expo-router';
import React from 'react';
import ConfirmOrderScreen from '../src/screens/ConfirmOrderScreen'; 

export default function ConfirmOrderRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, title: 'Pengesahan' }} />
      <ConfirmOrderScreen />
    </>
  );
}