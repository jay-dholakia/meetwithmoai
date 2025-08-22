import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { 
  getProjectInfo, 
  listTables, 
  executeSQL, 
  setupDatabase,
  exampleSchema 
} from '../lib/mcp-supabase';

interface ProjectInfo {
  id: string;
  name: string;
  status: string;
  region: string;
  database: {
    host: string;
    version: string;
  };
}

interface DatabaseTable {
  name: string;
  schema: string;
}

export default function MCPDashboard() {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [tables, setTables] = useState<DatabaseTable[]>([]);
  const [loading, setLoading] = useState(false);
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM users LIMIT 5;');

  const PROJECT_ID = 'hgllvhohhyamsbljekrd';

  useEffect(() => {
    loadProjectInfo();
    loadTables();
  }, []);

  const loadProjectInfo = async () => {
    try {
      setLoading(true);
      const info = await getProjectInfo(PROJECT_ID);
      setProjectInfo(info);
    } catch (error) {
      console.error('Error loading project info:', error);
      Alert.alert('Error', 'Failed to load project information');
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async () => {
    try {
      setLoading(true);
      const tableList = await listTables(PROJECT_ID);
      setTables(tableList);
    } catch (error) {
      console.error('Error loading tables:', error);
      Alert.alert('Error', 'Failed to load database tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupDatabase = async () => {
    try {
      setLoading(true);
      Alert.alert(
        'Setup Database',
        'This will create the initial database schema for your meetwithmoai app. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Continue',
            onPress: async () => {
              await setupDatabase(PROJECT_ID);
              Alert.alert('Success', 'Database schema has been set up successfully!');
              loadTables(); // Refresh the table list
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error setting up database:', error);
      Alert.alert('Error', 'Failed to set up database schema');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSQL = async () => {
    if (!sqlQuery.trim()) {
      Alert.alert('Error', 'Please enter a SQL query');
      return;
    }

    try {
      setLoading(true);
      const result = await executeSQL(PROJECT_ID, sqlQuery);
      Alert.alert('Success', `SQL executed successfully!\nResult: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error('Error executing SQL:', error);
      Alert.alert('Error', 'Failed to execute SQL query');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleData = async () => {
    const sampleQueries = [
      `INSERT INTO users (email, full_name, avatar_url) VALUES 
        ('john@example.com', 'John Doe', 'https://example.com/avatar1.jpg'),
        ('jane@example.com', 'Jane Smith', 'https://example.com/avatar2.jpg'),
        ('bob@example.com', 'Bob Johnson', 'https://example.com/avatar3.jpg');`,
      `INSERT INTO meetings (title, description, start_time, end_time, host_id) VALUES 
        ('Team Standup', 'Daily team standup meeting', NOW() + INTERVAL '1 day', NOW() + INTERVAL '1 day' + INTERVAL '30 minutes', 
         (SELECT id FROM users WHERE email = 'john@example.com' LIMIT 1));`
    ];

    try {
      setLoading(true);
      for (const query of sampleQueries) {
        await executeSQL(PROJECT_ID, query);
      }
      Alert.alert('Success', 'Sample data has been created successfully!');
    } catch (error) {
      console.error('Error creating sample data:', error);
      Alert.alert('Error', 'Failed to create sample data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>MCP Supabase Dashboard</Text>
      
      {/* Project Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Project Information</Text>
        {projectInfo ? (
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>Name: {projectInfo.name}</Text>
            <Text style={styles.infoText}>Status: {projectInfo.status}</Text>
            <Text style={styles.infoText}>Region: {projectInfo.region}</Text>
            <Text style={styles.infoText}>Database Host: {projectInfo.database.host}</Text>
            <Text style={styles.infoText}>PostgreSQL Version: {projectInfo.database.version}</Text>
          </View>
        ) : (
          <Text style={styles.loadingText}>Loading project info...</Text>
        )}
      </View>

      {/* Database Tables */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Tables</Text>
        {tables.length > 0 ? (
          tables.map((table, index) => (
            <View key={index} style={styles.tableItem}>
              <Text style={styles.tableName}>{table.name}</Text>
              <Text style={styles.tableSchema}>{table.schema}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No tables found</Text>
        )}
      </View>

      {/* Database Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Database Actions</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleSetupDatabase}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Setup Database Schema</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleCreateSampleData}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Create Sample Data</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={loadTables}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Refresh Tables</Text>
        </TouchableOpacity>
      </View>

      {/* SQL Query Executor */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>SQL Query Executor</Text>
        <Text style={styles.label}>Query:</Text>
        <Text style={styles.sqlQuery}>{sqlQuery}</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleExecuteSQL}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Execute SQL</Text>
        </TouchableOpacity>
      </View>

      {/* Schema Preview */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Schema Preview</Text>
        <Text style={styles.schemaTitle}>Users Table:</Text>
        <Text style={styles.schemaCode}>{exampleSchema.users}</Text>
        
        <Text style={styles.schemaTitle}>Meetings Table:</Text>
        <Text style={styles.schemaCode}>{exampleSchema.meetings}</Text>
        
        <Text style={styles.schemaTitle}>Meeting Participants Table:</Text>
        <Text style={styles.schemaCode}>{exampleSchema.meeting_participants}</Text>
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoContainer: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 4,
    color: '#555',
  },
  tableItem: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  tableName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  tableSchema: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  sqlQuery: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 12,
    color: '#333',
  },
  schemaTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#333',
  },
  schemaCode: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 6,
    fontFamily: 'monospace',
    fontSize: 10,
    color: '#333',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});


