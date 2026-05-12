import { Stack } from 'expo-router';
import React from 'react';
import FavoriteScreen from '../src/screens/FavoriteScreen'; 

export default function FavoritesRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <FavoriteScreen />
    </>
  );
}