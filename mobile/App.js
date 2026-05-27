import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { supabase } from './lib/supabase';
import { ActivityIndicator, View } from 'react-native';

// Import all screens
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import DashboardScreen from './screens/DashboardScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import PlansScreen from './screens/PlansScreen';
import ProfileScreen from './screens/ProfileScreen';
import SupportScreen from './screens/SupportScreen';
import PersonalInfoScreen from './screens/PersonalInfoScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen';
import TermsScreen from './screens/TermsScreen';

const Stack = createStackNavigator();

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
      } catch (error) {
        console.error('Session check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Safety timeout: Force hide splash screen after 5 seconds no matter what
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2089dc" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {session && session.user ? (
          // Authenticated Screens
          <>
            <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'My Net Dashboard' }} />
            <Stack.Screen name="Payments" component={PaymentsScreen} options={{ title: 'Payments & History' }} />
            <Stack.Screen name="Plans" component={PlansScreen} options={{ title: 'Internet Plans' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Get Help' }} />
            <Stack.Screen name="PersonalInfo" component={PersonalInfoScreen} options={{ title: 'Personal Information' }} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ title: 'Notifications' }} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms of Service' }} />
          </>
        ) : (
          // Auth Screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Signup" component={SignupScreen} options={{ title: 'Create Account' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
