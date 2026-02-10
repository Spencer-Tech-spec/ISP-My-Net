import React, { useState } from 'react';
import { View, StyleSheet, Alert, TextInput, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import FontAwesome from '@react-native-vector-icons/fontawesome';
import * as Linking from 'expo-linking';

export default function SignupScreen({ navigation }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    async function signUpWithEmail() {
        setLoading(true);
        const redirectTo = Linking.createURL('auth');

        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                emailRedirectTo: redirectTo,
            },
        });

        if (error) Alert.alert(error.message);
        else if (!session) Alert.alert('Check your inbox!', `A verification link has been sent to your email. It will redirect you back to: ${redirectTo}`);
        setLoading(false);
    }

    return (
        <View style={styles.container}>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputContainer}>
                    <FontAwesome name="envelope" size={20} color="#86939e" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="email@address.com"
                        placeholderTextColor="#86939e"
                        autoCapitalize={'none'}
                    />
                </View>
            </View>
            <View style={styles.verticallySpaced}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputContainer}>
                    <FontAwesome name="lock" size={24} color="#86939e" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={true}
                        placeholder="Password"
                        placeholderTextColor="#86939e"
                        autoCapitalize={'none'}
                    />
                </View>
            </View>
            <View style={[styles.verticallySpaced, styles.mt20]}>
                <TouchableOpacity
                    style={[styles.button, styles.buttonPrimary]}
                    onPress={() => signUpWithEmail()}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Sign up</Text>
                    )}
                </TouchableOpacity>
            </View>
            <View style={styles.verticallySpaced}>
                <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => navigation.navigate('Login')}
                    disabled={loading}
                >
                    <Text style={styles.buttonTextSecondary}>Back to Login</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 40,
        padding: 12,
        flex: 1,
        backgroundColor: '#fff',
    },
    verticallySpaced: {
        paddingTop: 4,
        paddingBottom: 4,
        alignSelf: 'stretch',
    },
    mt20: {
        marginTop: 20,
    },
    label: {
        fontSize: 16,
        color: '#86939e',
        fontWeight: 'bold',
        marginBottom: 5,
        marginLeft: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#86939e',
        paddingHorizontal: 10,
        paddingVertical: 5,
        marginBottom: 10,
    },
    icon: {
        marginRight: 10,
        width: 24,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: 18,
        color: '#000',
        paddingVertical: 5,
    },
    button: {
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonPrimary: {
        backgroundColor: '#2089dc',
    },
    buttonSecondary: {
        backgroundColor: 'transparent',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonTextSecondary: {
        color: '#2089dc',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
