import { Stack } from 'expo-router';
import React from 'react';
import PaymentScreen from '../src/screens/PaymentScreen'; 

export default function PaymentRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: true }} />
      <PaymentScreen />
    </>
  );
}