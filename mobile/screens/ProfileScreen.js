import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import { supabase } from '../lib/supabase';

export default function ProfileScreen({ navigation }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getUser();
    }, []);

    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
    };

    const handleSignOut = async () => {
        setLoading(true);
        const { error } = await supabase.auth.signOut();
        if (error) Alert.alert('Error', error.message);
        setLoading(false);
    };

    const menuItems = [
        { icon: 'user', title: 'Personal Information', action: () => navigation.navigate('PersonalInfo') },
        { icon: 'lock', title: 'Change Password', action: () => navigation.navigate('ChangePassword') },
        { icon: 'bell', title: 'Notifications', action: () => navigation.navigate('Notifications') },
        { icon: 'file-text', title: 'Terms & Conditions', action: () => navigation.navigate('Terms') },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <FontAwesome name="user" size={40} color="#fff" />
                </View>
                <Text style={styles.name}>{user?.email?.split('@')[0] || 'User'}</Text>
                <Text style={styles.email}>{user?.email}</Text>
            </View>

            <View style={styles.menuContainer}>
                {menuItems.map((item, index) => (
                    <TouchableOpacity key={index} style={styles.menuItem} onPress={item.action}>
                        <View style={styles.menuIconInfo}>
                            <View style={styles.iconBox}>
                                <FontAwesome name={item.icon} size={20} color="#666" />
                            </View>
                            <Text style={styles.menuText}>{item.title}</Text>
                        </View>
                        <FontAwesome name="angle-right" size={20} color="#ccc" />
                    </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#FF3B30" />
                    ) : (
                        <>
                            <FontAwesome name="sign-out" size={20} color="#FF3B30" style={{ marginRight: 10 }} />
                            <Text style={styles.signOutText}>Sign Out</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#2089dc',
        padding: 30,
        alignItems: 'center',
        paddingTop: 60,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
        borderWidth: 2,
        borderColor: '#fff',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 5,
    },
    email: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
    },
    menuContainer: {
        flex: 1,
        padding: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
    },
    menuIconInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconBox: {
        width: 36,
        height: 36,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#FF3B30',
    },
    signOutText: {
        fontSize: 16,
        color: '#FF3B30',
        fontWeight: 'bold',
    },
});
