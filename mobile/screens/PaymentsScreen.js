import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import FontAwesome from '@react-native-vector-icons/fontawesome';

// REPLACE WITH YOUR BACKEND URL (Use your computer's IP address if running on a physical device)
// For Android Emulator, use 'http://10.0.2.2:8000'
// For iOS Simulator, use 'http://localhost:8000'
const API_URL = 'http://192.168.1.10:8000';

export default function PaymentsScreen() {
    const [amount, setAmount] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);

    // Mock transaction history (can be replaced with API fetch later)
    const transactions = [
        { id: 1, date: 'Feb 01, 2026', amount: 'KES 2,500', status: 'Success' },
        { id: 2, date: 'Jan 01, 2026', amount: 'KES 2,500', status: 'Success' },
        { id: 3, date: 'Dec 01, 2025', amount: 'KES 2,500', status: 'Success' },
    ];

    const handlePayment = async () => {
        if (!amount || !phoneNumber) {
            Alert.alert('Error', 'Please enter amount and phone number');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/mpesa/stk_push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone_number: phoneNumber,
                    amount: parseInt(amount),
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Payment failed');
            }

            Alert.alert('Success', 'STK Push sent! Please check your phone to complete the payment.');
            setAmount('');
        } catch (error) {
            Alert.alert('Payment Error', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Payments</Text>
                <Text style={styles.subtitle}>Pay your bill easily with M-Pesa</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.sectionTitle}>M-Pesa Payment</Text>

                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputContainer}>
                    <FontAwesome name="mobile" size={24} color="#86939e" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="07XX XXX XXX"
                        keyboardType="phone-pad"
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                    />
                </View>

                <Text style={styles.label}>Amount (KES)</Text>
                <View style={styles.inputContainer}>
                    <FontAwesome name="money" size={20} color="#86939e" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <TouchableOpacity
                    style={styles.payButton}
                    onPress={handlePayment}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.payButtonText}>Pay Now</Text>
                    )}
                </TouchableOpacity>
            </View>

            <Text style={styles.historyTitle}>Recent Transactions</Text>
            {transactions.map((tx) => (
                <View key={tx.id} style={styles.transactionItem}>
                    <View style={styles.transactionIcon}>
                        <FontAwesome name="check" size={16} color="#4CAF50" />
                    </View>
                    <View style={styles.transactionDetails}>
                        <Text style={styles.transactionDate}>{tx.date}</Text>
                        <Text style={styles.transactionStatus}>{tx.status}</Text>
                    </View>
                    <Text style={styles.transactionAmount}>{tx.amount}</Text>
                </View>
            ))}
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
        marginBottom: 20,
        marginTop: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginTop: 5,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    label: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
        fontWeight: '500',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
    },
    icon: {
        marginRight: 10,
        width: 20,
        textAlign: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    payButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    historyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    transactionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    transactionDetails: {
        flex: 1,
    },
    transactionDate: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    transactionStatus: {
        fontSize: 12,
        color: '#666',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
});
