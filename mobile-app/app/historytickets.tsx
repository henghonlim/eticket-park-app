import { Stack } from 'expo-router';
import React from 'react';
import HistoryTicketsScreen from '../src/screens/HistoryTicketScreen';

export default function HistoryTicketsRoute() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false, 
          gestureEnabled: true,
          animation: 'slide_from_right'
        }} 
      />
      <HistoryTicketsScreen />
    </>
  );
}