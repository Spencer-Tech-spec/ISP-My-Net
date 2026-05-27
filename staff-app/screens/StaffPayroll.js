import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function StaffPayroll() {
  const [data, setData] = useState({ balance: 0, history: [], withdrawal_requests: [] });
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchPayroll = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a real mobile app, we'd use a more secure way to fetch this or call the backend API
      const response = await fetch(`http://localhost:8000/employees/${user.id}/payroll`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayroll();
  }, []);

  const handleWithdraw = async () => {
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid withdrawal amount.');
      return;
    }

    setWithdrawing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(`http://localhost:8000/employees/${user.id}/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      if (response.ok) {
        setAmount('');
        fetchPayroll();
        Alert.alert('Success', 'Withdrawal request submitted!');
      } else {
        const err = await response.json();
        Alert.alert('Error', err.detail || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Payroll</Text>
          <Text style={styles.subtitle}>Manage your earnings & withdrawals</Text>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.cardHeader}>
            <FontAwesome name="money" color="#fff" size={24} />
            <Text style={styles.cardTag}>Staff Balance</Text>
          </View>
          <Text style={styles.balanceLabel}>Available for withdrawal</Text>
          <Text style={styles.balanceValue}>KES {data.balance.toLocaleString()}</Text>
          <View style={styles.cardFooter}>
            <FontAwesome name="clock-o" color="rgba(255,255,255,0.6)" size={12} />
            <Text style={styles.updateText}>Last updated: Today</Text>
          </View>
        </View>

        {/* Quick Withdraw */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Request Funds</Text>
          <View style={styles.inputContainer}>
            <TextInput 
              style={styles.input}
              placeholder="Enter amount (KES)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <TouchableOpacity 
              style={[styles.withdrawBtn, { opacity: withdrawing ? 0.6 : 1 }]} 
              onPress={handleWithdraw}
              disabled={withdrawing}
            >
              <Text style={styles.withdrawBtnText}>{withdrawing ? '...' : 'Request'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {data.history.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No history found</Text>
          </View>
        ) : (
          data.history.slice(0, 5).map((tx) => (
            <View key={tx.id} style={styles.txItem}>
              <View style={[styles.txIcon, { backgroundColor: tx.amount > 0 ? '#f0fdf4' : '#fef2f2' }]}>
                {tx.amount > 0 ? <FontAwesome name="arrow-down" color="#16a34a" size={18} /> : <FontAwesome name="arrow-up" color="#ef4444" size={18} />}
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txType}>{tx.description || tx.type}</Text>
                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.amount > 0 ? '#16a34a' : '#0f172a' }]}>
                {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
              </Text>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.viewMoreBtn}>
          <Text style={styles.viewMoreText}>View All Transactions</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 100 },
  header: { paddingHorizontal: 24, paddingTop: 40, paddingBottom: 24 },
  title: { fontSize: 24, fontWeight: '900', color: '#0f172a' },
  subtitle: { fontSize: 13, color: '#64748b', marginTop: 4 },
  balanceCard: { 
    marginHorizontal: 24, 
    backgroundColor: '#4f46e5', 
    borderRadius: 32, 
    padding: 24,
    elevation: 8,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.3,
    shadowRadius: 20
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  cardTag: { color: '#fff', fontSize: 12, fontWeight: '800', opacity: 0.8, textTransform: 'uppercase' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  balanceValue: { color: '#fff', fontSize: 32, fontWeight: '900', marginBottom: 20 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  updateText: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600' },
  section: { padding: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginHorizontal: 24, marginBottom: 12 },
  inputContainer: { 
    flexDirection: 'row', 
    backgroundColor: '#fff', 
    borderRadius: 20, 
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#f1f5f9' 
  },
  input: { flex: 1, height: 50, paddingHorizontal: 16, fontSize: 16, fontWeight: '700', color: '#0f172a' },
  withdrawBtn: { backgroundColor: '#0f172a', paddingHorizontal: 20, borderRadius: 14, justifyContent: 'center' },
  withdrawBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },
  txItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#fff', 
    marginHorizontal: 24, 
    padding: 16, 
    borderRadius: 20, 
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9'
  },
  txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txInfo: { marginLeft: 12, flex: 1 },
  txType: { fontSize: 14, fontWeight: '700', color: '#1e293b' },
  txDate: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '900' },
  viewMoreBtn: { marginHorizontal: 24, paddingVertical: 16, alignItems: 'center' },
  viewMoreText: { color: '#4f46e5', fontWeight: '800', fontSize: 13 },
  emptyBox: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#cbd5e1', fontWeight: '600' }
});
