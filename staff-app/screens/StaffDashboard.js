import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, RefreshControl } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function StaffDashboard({ navigation }) {
  const [stats, setStats] = useState({ clients: 0, balance: 0, unreadCount: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDark, toggleTheme } = useTheme();

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch assigned clients count
      const { count } = await supabase
        .from('employee_clients')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id);

      // Fetch balance
      const { data: empData } = await supabase
        .from('employees')
        .select('current_balance')
        .eq('id', user.id)
        .single();

      // Fetch unread notifications
      const { count: unreadCount } = await supabase
        .from('employee_notifications')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', user.id)
        .eq('is_read', false);

      setStats({
        clients: count || 0,
        balance: empData?.current_balance || 0,
        unreadCount: unreadCount || 0
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen for new notifications in real-time
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'employee_notifications' },
        (payload) => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.header, { borderColor: theme.border }]}>
        <View>
          <Text style={[styles.greeting, { color: theme.text }]}>Staff Panel</Text>
          <Text style={[styles.subGreeting, { color: theme.subtext }]}>Welcome back, Member</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={toggleTheme}
          >
            {isDark ? <FontAwesome name="sun-o" color="#fbbf24" size={20} /> : <FontAwesome name="moon-o" color="#4f46e5" size={20} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.headerIconBtn, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => navigation.navigate('Notifications')}
          >
            <FontAwesome name="bell-o" color={theme.text} size={20} />
            {stats.unreadCount > 0 && <View style={styles.badge} />}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Status Bar */}
        <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.statusLeft}>
            <View style={styles.indicator} />
            <Text style={[styles.statusText, { color: theme.text }]}>On Duty • Active Session</Text>
          </View>
          <Text style={[styles.timeText, { color: theme.subtext }]}>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.grid}>
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => navigation.navigate('Clients')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#312e81' : '#eef2ff' }]}>
              <FontAwesome name="users" color="#4f46e5" size={24} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>Assigned Clients</Text>
            <Text style={[styles.cardValue, { color: theme.text }]}>{stats.clients}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => navigation.navigate('Payroll')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064e3b' : '#f0fdf4' }]}>
              <FontAwesome name="money" color="#16a34a" size={24} />
            </View>
            <Text style={[styles.cardLabel, { color: theme.subtext }]}>Current Balance</Text>
            <Text style={[styles.cardValue, { color: theme.text }]}>KES {(stats.balance || 0).toLocaleString()}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { width: '100%', backgroundColor: theme.card, borderColor: theme.border }]} 
            onPress={() => navigation.navigate('Routers')}
          >
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#78350f' : '#fff7ed' }]}>
              <FontAwesome name="wifi" color="#ea580c" size={24} />
            </View>
            <View style={styles.wideCardContent}>
              <View>
                <Text style={[styles.cardLabel, { color: theme.subtext }]}>Network Management</Text>
                <Text style={styles.cardSubLabel}>Manage routers & connectivity</Text>
              </View>
              <FontAwesome name="line-chart" color="#ea580c" size={20} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Tools</Text>
        <View style={styles.toolsContainer}>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <FontAwesome name="signal" color="#4f46e5" size={20} />
            <Text style={[styles.toolText, { color: theme.text }]}>Signal Test</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toolBtn, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <FontAwesome name="map-marker" color="#4f46e5" size={20} />
            <Text style={[styles.toolText, { color: theme.text }]}>Find Clients</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 40, 
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent'
  },
  headerActions: { flexDirection: 'row', gap: 12 },
  greeting: { fontSize: 24, fontWeight: '900' },
  subGreeting: { fontSize: 13, fontWeight: '600' },
  headerIconBtn: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  badge: { position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 2, borderColor: '#fff' },
  scrollContent: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 100 },
  statusCard: { 
    borderRadius: 20, 
    padding: 16, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 24,
    borderWidth: 1
  },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indicator: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  statusText: { fontSize: 12, fontWeight: '700' },
  timeText: { fontSize: 12, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  card: { 
    width: '47.5%', 
    padding: 20, 
    borderRadius: 28, 
    borderWidth: 1, 
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 10
  },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  cardLabel: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  cardSubLabel: { fontSize: 11, color: '#94a3b8' },
  cardValue: { fontSize: 18, fontWeight: '900' },
  wideCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 32, marginBottom: 16 },
  toolsContainer: { flexDirection: 'row', gap: 12 },
  toolBtn: { 
    flex: 1, 
    paddingVertical: 16, 
    borderRadius: 20, 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
    borderWidth: 1
  },
  toolText: { fontSize: 12, fontWeight: '700' }
});
