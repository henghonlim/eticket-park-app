import { Stack } from 'expo-router';
import React from 'react';
import AdminDashboardScreen from '../src/screens/AdminDashboard'; 

export default function AdminDashboardRoute() {
  return (
    <>
      <Stack.Screen 
        options={{  
          headerShown: false,
          gestureEnabled: false, 
        }} 
      />
      <AdminDashboardScreen />
    </>
  );
}