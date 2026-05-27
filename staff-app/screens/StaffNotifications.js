import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

export default function StaffNotifications({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const { theme, isDark } = useTheme();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('employee_notifications')
        .select('*')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      setNotifications(data || []);
      
      // Mark as read
      if (data && data.length > 0) {
        await supabase
          .from('employee_notifications')
          .update({ is_read: true })
          .eq('employee_id', user.id)
          .eq('is_read', false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'client_assigned': return <FontAwesome name="user-plus" color="#4f46e5" size={20} />;
      case 'salary_credit': return <FontAwesome name="money" color="#16a34a" size={20} />;
      case 'withdrawal_approved': return <FontAwesome name="check-circle" color="#22c55e" size={20} />;
      default: return <FontAwesome name="info-circle" color="#64748b" size={20} />;
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.notificationCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.iconBg }]}>
        {getIcon(item.type)}
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{item.title}</Text>
          <Text style={styles.cardTime}>{new Date(item.created_at).toLocaleDateString()}</Text>
        </View>
        <Text style={[styles.cardBody, { color: theme.subtext }]}>{item.body}</Text>
      </View>
      {!item.is_read && <View style={styles.unreadDot} />}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <FontAwesome name="chevron-left" color={theme.text} size={24} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Notifications</Text>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <FontAwesome name="bell-o" color="#cbd5e1" size={48} />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 24, 
    paddingTop: 40, 
    paddingBottom: 20, 
    gap: 16 
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '900' },
  listContent: { paddingHorizontal: 24, paddingBottom: 100 },
  notificationCard: { 
    flexDirection: 'row', 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center'
  },
  iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: '800' },
  cardTime: { fontSize: 10, color: '#94a3b8', fontWeight: '600' },
  cardBody: { fontSize: 13, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4f46e5', marginLeft: 8 },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyBox: { marginTop: 100, alignItems: 'center', gap: 12 },
  emptyText: { color: '#94a3b8', fontWeight: '600', fontSize: 16 }
});
