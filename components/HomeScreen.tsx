import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { useAuth } from '../contexts/AuthContext'
import MCPDashboard from './MCPDashboard'
import AIAssistant from './AIAssistant'

export default function HomeScreen() {
  const { user, signOut } = useAuth()
  const [showMCPDashboard, setShowMCPDashboard] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out')
    }
  }

  if (showMCPDashboard) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setShowMCPDashboard(false)}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <MCPDashboard />
      </View>
    )
  }

  if (showAIAssistant) {
    return (
      <View style={styles.container}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => setShowAIAssistant(false)}
        >
          <Text style={styles.backButtonText}>← Back to Home</Text>
        </TouchableOpacity>
        <AIAssistant />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to Meet With Moai!</Text>
      
      <View style={styles.userInfo}>
        <Text style={styles.userEmail}>Signed in as: {user?.email}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.subtitle}>Your app is ready!</Text>
        <Text style={styles.description}>
          You're now authenticated with Supabase. Start building your app features here.
        </Text>
        
        <TouchableOpacity 
          style={styles.mcpButton} 
          onPress={() => setShowMCPDashboard(true)}
        >
          <Text style={styles.mcpButtonText}>Open MCP Supabase Dashboard</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.aiButton} 
          onPress={() => setShowAIAssistant(true)}
        >
          <Text style={styles.aiButtonText}>🤖 Open AI Assistant</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 60,
    marginBottom: 20,
    color: '#333',
  },
  userInfo: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 8,
    marginBottom: 30,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  signOutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 30,
  },
  signOutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  mcpButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  mcpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    padding: 15,
    marginBottom: 10,
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  aiButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  aiButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
})







