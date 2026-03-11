import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: COLORS.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: 'CT Watershed Quiz', headerShown: false }}
        />
        <Stack.Screen
          name="quiz"
          options={{ title: 'Quiz', headerShown: false }}
        />
        <Stack.Screen
          name="stats"
          options={{ title: 'Stats' }}
        />
      </Stack>
    </>
  );
}
