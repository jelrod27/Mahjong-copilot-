import React, {useEffect} from 'react';
import {Provider} from 'react-redux';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {store} from './store';
import FirebaseService from './services/firebaseService';
import {initializeAuth} from './store/actions/authActions';
import {initializeSettings} from './store/actions/settingsActions';
import MainNavigation from './navigation/MainNavigation';

const App: React.FC = () => {
  useEffect(() => {
    // Initialize Firebase crash reporting
    FirebaseService.initializeCrashlytics();

    // Initialize auth state
    store.dispatch(initializeAuth() as any);

    // Initialize settings
    store.dispatch(initializeSettings() as any);
  }, []);

  return (
    <Provider store={store}>
      <NavigationContainer>
        <MainNavigation />
      </NavigationContainer>
    </Provider>
  );
};

export default App;

