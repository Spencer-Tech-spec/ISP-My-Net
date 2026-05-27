import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { FontAwesome } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ThemeProvider } from './context/ThemeContext';

// Import screens (to be created)
import StaffDashboard from './screens/StaffDashboard';
import StaffClients from './screens/StaffClients';
import StaffPayroll from './screens/StaffPayroll';
import StaffRouters from './screens/StaffRouters';
import StaffProfile from './screens/StaffProfile';
import StaffNotifications from './screens/StaffNotifications';
import LoginScreen from './screens/LoginScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          if (route.name === 'Home') return <FontAwesome name="dashboard" size={size} color={color} />;
          if (route.name === 'Clients') return <FontAwesome name="users" size={size} color={color} />;
          if (route.name === 'Payroll') return <FontAwesome name="money" size={size} color={color} />;
          if (route.name === 'Routers') return <FontAwesome name="wifi" size={size} color={color} />;
          if (route.name === 'Profile') return <FontAwesome name="user" size={size} color={color} />;
        },
        tabBarActiveTintColor: '#4f46e5',
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: {
          height: 70,
          paddingBottom: 15,
          paddingTop: 10,
          borderTopWidth: 1,
          borderTopColor: '#f1f5f9',
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        },
      })}
    >
      <Tab.Screen name="Home" component={StaffDashboard} />
      <Tab.Screen name="Clients" component={StaffClients} />
      <Tab.Screen name="Routers" component={StaffRouters} />
      <Tab.Screen name="Payroll" component={StaffPayroll} />
      <Tab.Screen name="Profile" component={StaffProfile} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Login">
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Main" component={TabNavigator} />
              <Stack.Screen name="Notifications" component={StaffNotifications} />
            </Stack.Navigator>
          </NavigationContainer>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
