import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AIAgentScreen from '../screens/AIAgentScreen';
import MoaiMatchesScreen from '../screens/MoaiMatchesScreen';
import ConversationScreen from '../screens/ConversationScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ConnectionsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ConnectionsList" component={MoaiMatchesScreen} />
      <Stack.Screen name="Conversation" component={ConversationScreen} />
    </Stack.Navigator>
  );
}

export default function TabNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Matcha AI') {
            iconName = focused ? 'cafe' : 'cafe-outline';
          } else if (route.name === 'Connections') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6B8E23',
        tabBarInactiveTintColor: '#6B7B6B',
        tabBarStyle: {
          backgroundColor: '#FEFFFE',
          borderTopColor: '#DDE8DD',
          borderTopWidth: 1,
          paddingBottom: Math.max(insets.bottom, 5),
          paddingTop: 5,
          height: 60 + Math.max(insets.bottom - 5, 0),
        },
        headerStyle: {
          backgroundColor: '#FEFFFE',
          borderBottomColor: '#DDE8DD',
          borderBottomWidth: 1,
        },
        headerTintColor: '#2D3D2D',
        headerTitleStyle: {
          fontFamily: 'InterTight-Bold',
          fontSize: 18,
        },
      })}
    >
      <Tab.Screen 
        name="Matcha AI" 
        component={AIAgentScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Connections" 
        component={ConnectionsStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}





