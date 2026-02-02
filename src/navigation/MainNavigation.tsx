import React from 'react';
import {useSelector} from 'react-redux';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {AppColors} from '../theme/appTheme';
import {getLocalizedString} from '../utils/localization';
import {RootState} from '../store/reducers/rootReducer';

// Import screens
import HomeScreen from '../features/home/HomeScreen';
import LearnNavigator from './LearnNavigator';
import PracticeScreen from '../features/practice/PracticeScreen';
import ReferenceScreen from '../features/reference/ReferenceScreen';
import ProgressScreen from '../features/progress/ProgressScreen';
import SettingsScreen from '../features/settings/SettingsScreen';

const Tab = createBottomTabNavigator();

const MainNavigation: React.FC = () => {
  const locale = useSelector((state: RootState) => state.settings.locale);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: AppColors.primaryGreen,
        tabBarInactiveTintColor: AppColors.textSecondary,
        headerStyle: {
          backgroundColor: AppColors.primaryGreen,
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="home" size={size} color={color} />
          ),
          title: getLocalizedString('nav_home', locale),
        }}
      />
      <Tab.Screen
        name="Learn"
        component={LearnNavigator}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="menu-book" size={size} color={color} />
          ),
          title: getLocalizedString('nav_learn', locale),
          headerShown: false, // LearnNavigator handles its own headers
        }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="casino" size={size} color={color} />
          ),
          title: getLocalizedString('nav_practice', locale),
        }}
      />
      <Tab.Screen
        name="Reference"
        component={ReferenceScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="library-books" size={size} color={color} />
          ),
          title: getLocalizedString('nav_reference', locale),
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="trending-up" size={size} color={color} />
          ),
          title: getLocalizedString('nav_progress', locale),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarIcon: ({color, size}) => (
            <Icon name="settings" size={size} color={color} />
          ),
          title: getLocalizedString('nav_settings', locale),
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigation;

