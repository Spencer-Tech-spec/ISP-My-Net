import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, SafeAreaView } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function StaffClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('employee_clients')
        .select('*, profiles:client_id(full_name, address, phone, status, plan)')
        .eq('employee_id', user.id);

      setClients(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(item => 
    item.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    item.profiles?.address?.toLowerCase().includes(search.toLowerCase())
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.clientCard}>
      <View style={styles.clientInfo}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.profiles?.full_name?.charAt(0)}</Text>
        </View>
        <View style={styles.details}>
          <Text style={styles.clientName}>{item.profiles?.full_name}</Text>
          <View style={styles.metaRow}>
            <FontAwesome name="map-marker" size={12} color="#64748b" />
            <Text style={styles.metaText}>{item.profiles?.address}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.statusBox}>
        <View style={[styles.statusBadge, { backgroundColor: item.profiles?.status === 'Active' ? '#f0fdf4' : '#fef2f2' }]}>
          <Text style={[styles.statusText, { color: item.profiles?.status === 'Active' ? '#16a34a' : '#ef4444' }]}>
            {item.profiles?.status}
          </Text>
        </View>
        <FontAwesome name="chevron-right" size={18} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Clients</Text>
        <Text style={styles.subtitle}>Subscribers assigned to your sector</Text>
      </View>

      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput}
          placeholder="Search by name or address..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredClients}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="users" size={48} color="#e2e8f0" />
            <Text style={styles.emptyText}>No clients found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  searchContainer: { 
    marginHorizontal: 24, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 20
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, height: 50, fontSize: 14, color: '#1e293b' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  clientCard: { 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  clientInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  details: { marginLeft: 12, flex: 1 },
  clientName: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4 },
  metaText: { fontSize: 12, color: '#64748b' },
  statusBox: { alignItems: 'flex-end', gap: 8 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 14, fontWeight: '600' }
});
