import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AIAgentScreen from '../screens/AIAgentScreen';
import MoaiMatchesScreen from '../screens/MoaiMatchesScreen';
import ConversationScreen from '../screens/ConversationScreen';
import ProfileScreen from '../screens/ProfileScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import EditQuestionnaireScreen from '../screens/EditQuestionnaireScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';
import NotificationPreferencesScreen from '../screens/NotificationPreferencesScreen';
import MatchStatisticsScreen from '../screens/MatchStatisticsScreen';
import SafetyPrivacyScreen from '../screens/SafetyPrivacyScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';

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

function ProfileStack() {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="ProfileMain" component={ProfileScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="EditQuestionnaire" component={EditQuestionnaireScreen} />
      <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
      <Stack.Screen name="NotificationPreferences" component={NotificationPreferencesScreen} />
      <Stack.Screen name="MatchStatistics" component={MatchStatisticsScreen} />
      <Stack.Screen name="SafetyPrivacy" component={SafetyPrivacyScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
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

          if (route.name === 'Mili') {
            iconName = focused ? 'sparkles' : 'sparkles-outline';
          } else if (route.name === 'People') {
            iconName = focused ? 'cafe' : 'cafe-outline';
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
        name="Mili" 
        component={AIAgentScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="People" 
        component={ConnectionsStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}





