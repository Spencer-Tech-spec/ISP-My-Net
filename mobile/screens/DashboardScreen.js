import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Linking } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { supabase } from '../lib/supabase';

export default function DashboardScreen({ navigation }) {
    const [refreshing, setRefreshing] = useState(false);
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('Active'); // Mock status for now
    const [plan, setPlan] = useState('Home Fiber - 50 Mbps'); // Mock plan

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        // Simulate network request
        setTimeout(() => {
            setRefreshing(false);
        }, 2000);
    }, []);

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userName}>{user?.email?.split('@')[0] || 'User'}</Text>
            </View>

            {/* Connection Status Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Connection Status</Text>
                    <FontAwesome name="signal" size={20} color={status === 'Active' ? '#4CAF50' : '#F44336'} />
                </View>
                <Text style={[styles.statusText, { color: status === 'Active' ? '#4CAF50' : '#F44336' }]}>
                    {status}
                </Text>
                <Text style={styles.lastChecked}>Last checked: Just now</Text>
            </View>

            {/* Current Plan Card */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>Your Plan</Text>
                    <FontAwesome name="rocket" size={20} color="#2089dc" />
                </View>
                <Text style={styles.planText}>{plan}</Text>
                <Text style={styles.expiryText}>Renews on: Feb 28, 2026</Text>
                <TouchableOpacity style={styles.upgradeButton} onPress={() => navigation.navigate('Plans')}>
                    <Text style={styles.upgradeButtonText}>Manage Plan</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <View style={styles.quickActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Payments')}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E3F2FD' }]}>
                        <FontAwesome name="money" size={24} color="#2089dc" />
                    </View>
                    <Text style={styles.actionText}>Pay Bill</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Support')}>
                    <View style={[styles.iconCircle, { backgroundColor: '#FFF3E0' }]}>
                        <FontAwesome name="life-ring" size={24} color="#FF9800" />
                    </View>
                    <Text style={styles.actionText}>Support</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton} onPress={() => Linking.openURL('https://fast.com')}>
                    <View style={[styles.iconCircle, { backgroundColor: '#E8F5E9' }]}>
                        <FontAwesome name="tachometer" size={24} color="#4CAF50" />
                    </View>
                    <Text style={styles.actionText}>Speed Test</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    header: {
        marginBottom: 24,
        marginTop: 10,
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
    },
    statusText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    lastChecked: {
        fontSize: 12,
        color: '#999',
    },
    planText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    expiryText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    upgradeButton: {
        backgroundColor: '#f0f9ff',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#2089dc',
        fontWeight: '600',
    },
    quickActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    actionButton: {
        alignItems: 'center',
        width: '30%',
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
});
