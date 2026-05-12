import { Stack } from 'expo-router';
import React from 'react';
import AdminSystemScreen from '../src/screens/AdminSystemScreen'; 

export default function AdminSystemRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AdminSystemScreen key={Date.now()} />
    </>
  );
}