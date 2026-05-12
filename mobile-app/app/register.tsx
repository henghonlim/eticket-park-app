import { Stack } from 'expo-router';
import React from 'react';
import RegisterScreen from '../src/screens/RegisterScreen';

export default function RegisterRoute() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false
        }} 
      />
      <RegisterScreen />
    </>
  );
}