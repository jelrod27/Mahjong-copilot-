import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import LearnScreen from '../features/learn/LearnScreen';
import LessonScreen from '../features/learn/LessonScreen';
import {Lesson} from '../content/level1';
import {AppColors} from '../theme/appTheme';

// Define the param list for type safety
export type LearnStackParamList = {
  LearnHome: undefined;
  Lesson: {lesson: Lesson};
};

const Stack = createStackNavigator<LearnStackParamList>();

const LearnNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: AppColors.primaryGreen,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="LearnHome"
        component={LearnScreen}
        options={{
          title: 'Learn',
          headerShown: false, // We have custom header in LearnScreen
        }}
      />
      <Stack.Screen
        name="Lesson"
        component={LessonScreen}
        options={{
          headerShown: false, // LessonScreen has its own header
        }}
      />
    </Stack.Navigator>
  );
};

export default LearnNavigator;
