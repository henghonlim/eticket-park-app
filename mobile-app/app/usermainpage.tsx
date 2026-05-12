import { Stack } from 'expo-router';
import React from 'react';
import UserMainPageScreen from '../src/screens/UserMainPage'; 

export default function UserMainPageRoute() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          gestureEnabled: false, 
        }} 
      />
      <UserMainPageScreen />
    </>
  );
}