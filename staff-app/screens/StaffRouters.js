import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function StaffRouters() {
  const [routers, setRouters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRouters();
  }, []);

  const fetchRouters = async () => {
    try {
      const { data } = await supabase.from('mikrotik_routers').select('id, name, host, port');
      setRouters(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.routerCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <FontAwesome name="wifi" color="#fff" size={24} />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.routerName}>{item.name}</Text>
          <Text style={styles.routerHost}>{item.host}:{item.port}</Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <FontAwesome name="line-chart" color="#4f46e5" size={16} />
          <Text style={styles.statLabel}>CPU</Text>
          <Text style={styles.statValue}>12%</Text>
        </View>
        <View style={styles.statItem}>
          <FontAwesome name="bolt" color="#ea580c" size={16} />
          <Text style={styles.statLabel}>Traffic</Text>
          <Text style={styles.statValue}>45M</Text>
        </View>
        <View style={styles.statItem}>
          <FontAwesome name="shield" color="#16a34a" size={16} />
          <Text style={styles.statLabel}>Users</Text>
          <Text style={styles.statValue}>128</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.configBtn}>
          <Text style={styles.configBtnText}>Configure</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.rebootBtn}>
          <FontAwesome name="refresh" color="#64748b" size={18} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Network Status</Text>
        <Text style={styles.subtitle}>Monitor and manage MikroTik routers</Text>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <FlatList
          data={routers}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No routers configured</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 16 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  routerCard: { 
    backgroundColor: '#fff', 
    borderRadius: 28, 
    padding: 20, 
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 15
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  iconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center' },
  headerInfo: { marginLeft: 16, flex: 1 },
  routerName: { fontSize: 16, fontWeight: '800', color: '#1e293b' },
  routerHost: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  statusBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { color: '#16a34a', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f8fafc', borderRadius: 20, padding: 16, marginBottom: 20 },
  statItem: { alignItems: 'center', gap: 4 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
  statValue: { fontSize: 14, fontWeight: '900', color: '#1e293b' },
  actions: { flexDirection: 'row', gap: 12 },
  configBtn: { flex: 1, backgroundColor: '#0f172a', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  configBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  rebootBtn: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { marginTop: 100, alignItems: 'center' },
  emptyText: { color: '#94a3b8', fontWeight: '600' }
});
