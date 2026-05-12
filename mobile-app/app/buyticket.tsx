import { Stack } from 'expo-router';
import React from 'react';
import BuyTicketScreen from '../src/screens/BuyTicketScreen'; 

export default function BuyTicketRoute() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          gestureEnabled: true, 
        }} 
      />
      <BuyTicketScreen />
    </>
  );
}