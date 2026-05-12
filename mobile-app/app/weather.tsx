import { Stack } from 'expo-router';
import React from 'react';
import WeatherScreen from '../src/screens/WeatherScreen'; 

export default function CuacaRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <WeatherScreen />
    </>
  );
}