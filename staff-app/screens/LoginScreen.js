import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user is staff/admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // Fallback to user metadata if profile not synced yet
      const role = profile?.role || data.user.user_metadata?.role;

      if (role !== 'employee' && role !== 'admin') {
        await supabase.auth.signOut();
        Alert.alert('Unauthorized', 'This app is only for authorized staff members.');
        return;
      }

      navigation.replace('Main');
    } catch (error) {
      Alert.alert('Login Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <FontAwesome name="shield" color="#fff" size={40} />
            </View>
            <Text style={styles.title}>Staff Portal</Text>
            <Text style={styles.subtitle}>Authorized personnel only</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Corporate Email</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome name="envelope" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="name@company.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Security Password</Text>
              <View style={styles.inputWrapper}>
                <FontAwesome name="lock" size={20} color="#94a3b8" style={styles.inputIcon} />
                <TextInput 
                  style={styles.input}
                  placeholder="••••••••"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity 
              style={[styles.loginBtn, loading && styles.disabledBtn]} 
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.loginBtnText}>Secure Login</Text>
                  <FontAwesome name="arrow-right" color="#fff" size={20} />
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Trouble logging in?</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Contact IT Support</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },
  content: { flex: 1, padding: 32, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 48 },
  logoContainer: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#4f46e5', alignItems: 'center', justifyContent: 'center', marginBottom: 24, elevation: 12, shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 20 },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  form: { gap: 24 },
  inputGroup: { gap: 8 },
  label: { fontSize: 13, fontWeight: '700', color: '#1e293b', marginLeft: 4 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#f1f5f9' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, height: 56, fontSize: 15, fontWeight: '600', color: '#0f172a' },
  loginBtn: { backgroundColor: '#0f172a', height: 64, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 15 },
  disabledBtn: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  footer: { marginTop: 48, alignItems: 'center', gap: 8 },
  footerText: { color: '#64748b', fontSize: 14, fontWeight: '500' },
  footerLink: { color: '#4f46e5', fontSize: 14, fontWeight: '700' }
});
