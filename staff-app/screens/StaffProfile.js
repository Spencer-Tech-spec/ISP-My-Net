import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  TextInput, Alert, ScrollView, ActivityIndicator, Switch
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function StaffProfile({ navigation }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', user.id)
          .single();
        setProfile(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setCurrentPassword('');
      setShowPasswordForm(false);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#4f46e5" size="large" />
        </View>
      </SafeAreaView>
    );
  }

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '??';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'Staff Member'}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <FontAwesome name="shield" size={12} color="#4f46e5" />
            <Text style={styles.roleText}>{profile?.role?.toUpperCase() || 'EMPLOYEE'}</Text>
          </View>
        </View>

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Info</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <FontAwesome name="user" size={18} color="#4f46e5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>{profile?.full_name || '—'}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <FontAwesome name="envelope" size={18} color="#4f46e5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email Address</Text>
                <Text style={styles.infoValue}>{user?.email || '—'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notifications Toggle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <FontAwesome name="bell" size={18} color="#4f46e5" />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Push Notifications</Text>
                <Text style={styles.infoValue}>Payroll & assignments</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e2e8f0', true: '#c7d2fe' }}
                thumbColor={notifications ? '#4f46e5' : '#94a3b8'}
              />
            </View>
          </View>
        </View>

        {/* Security Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => setShowPasswordForm(!showPasswordForm)}
            >
              <View style={styles.infoIcon}>
                <FontAwesome name="lock" size={18} color="#4f46e5" />
              </View>
              <Text style={styles.actionLabel}>Change Password</Text>
              <FontAwesome name="chevron-right" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            {showPasswordForm && (
              <View style={styles.passwordForm}>
                <View style={styles.divider} />

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Min 8 characters"
                      secureTextEntry={!showNew}
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity onPress={() => setShowNew(!showNew)}>
                      {showNew ? <FontAwesome name="eye-slash" size={18} color="#94a3b8" /> : <FontAwesome name="eye" size={18} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <View style={styles.inputWrapper}>
                    <TextInput
                      style={styles.input}
                      placeholder="Re-enter password"
                      secureTextEntry={!showConfirm}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholderTextColor="#94a3b8"
                    />
                    <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
                      {showConfirm ? <FontAwesome name="eye-slash" size={18} color="#94a3b8" /> : <FontAwesome name="eye" size={18} color="#94a3b8" />}
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={handleChangePassword}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <><FontAwesome name="check-circle" size={16} color="#fff" /><Text style={styles.saveBtnText}>Update Password</Text></>
                  }
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Sign Out */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <FontAwesome name="sign-out" size={20} color="#ef4444" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>My Net Staff App • v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { paddingBottom: 120 },

  heroCard: {
    backgroundColor: '#4f46e5',
    margin: 24,
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  avatarRing: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16
  },
  avatar: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '900', color: '#4f46e5' },
  name: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4 },
  email: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', marginBottom: 12 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20
  },
  roleText: { fontSize: 11, fontWeight: '800', color: '#4f46e5' },

  section: { paddingHorizontal: 24, marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },

  card: {
    backgroundColor: '#fff', borderRadius: 20,
    borderWidth: 1, borderColor: '#f1f5f9',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8
  },

  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  infoIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  infoContent: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoValue: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f8fafc', marginHorizontal: 16 },

  actionRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  actionLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1e293b' },

  passwordForm: { paddingHorizontal: 16, paddingBottom: 16 },
  inputGroup: { marginTop: 12 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f8fafc', borderRadius: 14,
    paddingHorizontal: 14, borderWidth: 1, borderColor: '#e2e8f0'
  },
  input: { flex: 1, height: 48, fontSize: 14, fontWeight: '600', color: '#1e293b' },

  saveBtn: {
    backgroundColor: '#0f172a', height: 50, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 16
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  signOutBtn: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, borderWidth: 1.5, borderColor: '#fee2e2',
    elevation: 2, shadowColor: '#ef4444', shadowOpacity: 0.08, shadowRadius: 8
  },
  signOutText: { color: '#ef4444', fontSize: 16, fontWeight: '800' },

  version: { textAlign: 'center', color: '#cbd5e1', fontSize: 12, fontWeight: '600', marginTop: 16 }
});
