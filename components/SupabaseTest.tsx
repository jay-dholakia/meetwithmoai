import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { supabase } from '../lib/supabase'

export default function SupabaseTest() {
  const [status, setStatus] = useState<string>('Testing connection...')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        // Test the connection by getting the current user (will be null if not authenticated)
        const { data, error } = await supabase.auth.getUser()
        
        if (error) {
          setError(`Connection error: ${error.message}`)
          setStatus('❌ Connection failed')
        } else {
          setStatus('✅ Connected to Supabase!')
        }
      } catch (err) {
        setError(`Unexpected error: ${err}`)
        setStatus('❌ Connection failed')
      }
    }

    testConnection()
  }, [])

  return (
    <View style={styles.container}>
      <Text style={styles.status}>{status}</Text>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    margin: 10,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  error: {
    fontSize: 14,
    color: 'red',
    marginTop: 10,
    textAlign: 'center',
  },
})







