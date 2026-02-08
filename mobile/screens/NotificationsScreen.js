import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';

export default function NotificationsScreen() {
    const [pushEnabled, setPushEnabled] = useState(true);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [smsEnabled, setSmsEnabled] = useState(false);

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>General Notifications</Text>

                <View style={styles.row}>
                    <View style={styles.textContainer}>
                        <Text style={styles.optionTitle}>Push Notifications</Text>
                        <Text style={styles.optionSubtitle}>Receive alerts on your device</Text>
                    </View>
                    <Switch
                        value={pushEnabled}
                        onValueChange={setPushEnabled}
                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                        thumbColor={pushEnabled ? "#2089dc" : "#f4f3f4"}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <View style={styles.textContainer}>
                        <Text style={styles.optionTitle}>Email Updates</Text>
                        <Text style={styles.optionSubtitle}>Receive newsletters and promotions</Text>
                    </View>
                    <Switch
                        value={emailEnabled}
                        onValueChange={setEmailEnabled}
                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                        thumbColor={emailEnabled ? "#2089dc" : "#f4f3f4"}
                    />
                </View>

                <View style={styles.divider} />

                <View style={styles.row}>
                    <View style={styles.textContainer}>
                        <Text style={styles.optionTitle}>SMS Alerts</Text>
                        <Text style={styles.optionSubtitle}>Receive critical alerts via SMS</Text>
                    </View>
                    <Switch
                        value={smsEnabled}
                        onValueChange={setSmsEnabled}
                        trackColor={{ false: "#767577", true: "#81b0ff" }}
                        thumbColor={smsEnabled ? "#2089dc" : "#f4f3f4"}
                    />
                </View>
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
    section: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 20,
        color: '#333',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10,
    },
    textContainer: {
        flex: 1,
        paddingRight: 10,
    },
    optionTitle: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    optionSubtitle: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 10,
    },
});
