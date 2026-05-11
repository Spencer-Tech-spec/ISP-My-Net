import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

export default function PlansScreen({ navigation }) {
    const plans = [
        {
            id: 'basic',
            name: 'Basic Plan',
            speed: '5 Mbps',
            price: '1,500',
            color: '#4CAF50',
            features: ['Unlimited Data', 'Stable Connection', '24/7 Support']
        },
        {
            id: 'diamond',
            name: 'Diamond Plan',
            speed: '10 Mbps',
            price: '2,000',
            color: '#2089dc',
            popular: true,
            features: ['Unlimited Data', 'High Speed', 'Prioritized Support', 'Ideal for Streaming']
        },
        {
            id: 'gold',
            name: 'Gold Plan',
            speed: '20 Mbps',
            price: '3,000',
            color: '#FFD700',
            features: ['Unlimited Data', 'Ultra High Speed', 'Premium Support', '4K Streaming & Gaming']
        }
    ];

    const handleSelectPlan = (plan) => {
        Alert.alert(
            'Confirm Plan Change',
            `Do you want to switch to the ${plan.name} for KES ${plan.price}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: () => {
                        Alert.alert('Success', `You have requested to upgrade to ${plan.name}. We will process this shortly.`);
                        navigation.goBack();
                    }
                }
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Choose Your Plan</Text>
                <Text style={styles.subtitle}>Select the perfect speed for your needs</Text>
            </View>

            {plans.map((plan) => (
                <View key={plan.id} style={[styles.card, plan.popular && styles.popularCard]}>
                    {plan.popular && (
                        <View style={styles.popularBadge}>
                            <Text style={styles.popularText}>MOST POPULAR</Text>
                        </View>
                    )}

                    <View style={styles.planHeader}>
                        <View>
                            <Text style={styles.planName}>{plan.name}</Text>
                            <Text style={styles.planSpeed}>{plan.speed}</Text>
                        </View>
                        <Text style={[styles.planPrice, { color: plan.popular ? '#2089dc' : '#333' }]}>
                            KES {plan.price}
                        </Text>
                    </View>

                    <View style={styles.divider} />

                    {plan.features.map((feature, index) => (
                        <View key={index} style={styles.featureRow}>
                            <FontAwesome name="check-circle" size={16} color={plan.color} />
                            <Text style={styles.featureText}>{feature}</Text>
                        </View>
                    ))}

                    <TouchableOpacity
                        style={[styles.subscribeButton, { backgroundColor: plan.color }]}
                        onPress={() => handleSelectPlan(plan)}
                    >
                        <Text style={styles.buttonText}>Choose {plan.name}</Text>
                    </TouchableOpacity>
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
        marginBottom: 24,
        marginTop: 10,
        alignItems: 'center',
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
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: 'transparent',
        position: 'relative',
    },
    popularCard: {
        borderColor: '#2089dc',
        borderWidth: 2,
        transform: [{ scale: 1.02 }],
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        alignSelf: 'center',
        backgroundColor: '#2089dc',
        paddingHorizontal: 16,
        paddingVertical: 4,
        borderRadius: 12,
    },
    popularText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    planName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    planSpeed: {
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
        marginTop: 4,
    },
    planPrice: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginBottom: 16,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    featureText: {
        marginLeft: 10,
        fontSize: 14,
        color: '#555',
    },
    subscribeButton: {
        marginTop: 8,
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        elevation: 1,
    },
    buttonText: {
        color: '#fff', // Changed to white for better contrast on colored buttons
        fontWeight: 'bold',
        fontSize: 16,
        textShadowColor: 'rgba(0, 0, 0, 0.2)', // Optional shadow for basic and gold plans
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
});
