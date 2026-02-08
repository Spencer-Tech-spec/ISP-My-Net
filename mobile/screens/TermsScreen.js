import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function TermsScreen() {
    return (
        <ScrollView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Terms and Conditions</Text>

                <Text style={styles.sectionHeader}>1. Introduction</Text>
                <Text style={styles.text}>
                    Welcome to My Net ISP. By using our services, you agree to comply with and be bound by the following terms and conditions.
                </Text>

                <Text style={styles.sectionHeader}>2. Service Usage</Text>
                <Text style={styles.text}>
                    Our internet services are provided for personal and lawful use only. You agree not to use the service for any illegal activities or to disrupt the network for other users.
                </Text>

                <Text style={styles.sectionHeader}>3. Payments and Billing</Text>
                <Text style={styles.text}>
                    Bills are generated monthly. Payment must be made by the due date to avoid service interruption. We reserve the right to suspend services for non-payment.
                </Text>

                <Text style={styles.sectionHeader}>4. Privacy Policy</Text>
                <Text style={styles.text}>
                    We respect your privacy and are committed to protecting your personal data. We do not sell your personal information to third parties.
                </Text>

                <Text style={styles.sectionHeader}>5. Changes to Terms</Text>
                <Text style={styles.text}>
                    We reserve the right to modify these terms at any time. Users will be notified of significant changes explicitly.
                </Text>

                <Text style={styles.footer}>Last Updated: Feb 2026</Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    content: {
        backgroundColor: '#fff',
        margin: 16,
        padding: 20,
        borderRadius: 12,
        elevation: 2,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#2089dc',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        marginTop: 15,
        marginBottom: 8,
        color: '#333',
    },
    text: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
        marginBottom: 10,
    },
    footer: {
        marginTop: 30,
        fontStyle: 'italic',
        color: '#999',
        textAlign: 'center',
    },
});
