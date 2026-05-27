import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert, Linking } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

export default function SupportScreen() {
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [userQuestion, setUserQuestion] = useState('');
    const [chatMessages, setChatMessages] = useState([
        { text: 'Hello! I can help with billing, connection issues, or router setup. What do you need help with?', sender: 'bot' }
    ]);

    const getBotResponse = (question) => {
        const lowerQ = question.toLowerCase();

        if (lowerQ.includes('reset') || lowerQ.includes('restart')) {
            return "To reset your router, locate the small reset button on the back. Press and hold it for 10 seconds until the lights flash.";
        } else if (lowerQ.includes('slow') || lowerQ.includes('speed')) {
            return "Slow internet can be caused by interference. Try moving closer to the router or restarting it. If it persists, run a speed test on the dashboard.";
        } else if (lowerQ.includes('password') || lowerQ.includes('wifi')) {
            return "To change your WiFi password, log in to your router admin page (usually 192.168.0.1 or 192.168.1.1) using the credentials on the sticker.";
        } else if (lowerQ.includes('pay') || lowerQ.includes('bill') || lowerQ.includes('cost')) {
            return "You can pay your bill via M-Pesa on the Payments tab. We accept payments to our Paybill number.";
        } else if (lowerQ.includes('contact') || lowerQ.includes('email') || lowerQ.includes('phone')) {
            return "You can contact us via the buttons above: Call, Email, or Live Chat.";
        } else {
            return "I'm not sure about that. Please try rephrasing or submit a ticket below for a human agent.";
        }
    };

    const handleChatSubmit = () => {
        if (!userQuestion.trim()) return;

        const newMessages = [...chatMessages, { text: userQuestion, sender: 'user' }];
        setChatMessages(newMessages);

        // Simulate thinking delay
        setTimeout(() => {
            const response = getBotResponse(userQuestion);
            setChatMessages(prev => [...prev, { text: response, sender: 'bot' }]);
        }, 500);

        setUserQuestion('');
    };

    const [myTickets, setMyTickets] = useState([]);

    const fetchMyTickets = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data } = await supabase
                .from('support_tickets')
                .select('*')
                .eq('client_id', user.id)
                .order('created_at', { ascending: false });
            setMyTickets(data || []);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        fetchMyTickets();
    }, []);

    const handleSubmitTicket = async () => {
        if (!subject || !message) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Not logged in");

            const { error } = await supabase.from('support_tickets').insert({
                client_id: user.id,
                subject,
                description: message,
                status: 'open',
                priority: 'medium'
            });

            if (error) throw error;

            Alert.alert('Success', 'Your issue has been raised! An admin will assign a technician shortly.');
            setSubject('');
            setMessage('');
            fetchMyTickets();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to submit ticket');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Support Center</Text>
                <Text style={styles.subtitle}>How can we help you today?</Text>
            </View>

            {/* My Tickets Section */}
            {myTickets.length > 0 && (
                <View style={styles.ticketsSection}>
                    <Text style={styles.sectionTitle}>My Open Issues</Text>
                    {myTickets.map(ticket => (
                        <View key={ticket.id} style={styles.ticketCard}>
                            <View style={styles.ticketHeader}>
                                <Text style={styles.ticketSubject}>{ticket.subject}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'open' ? '#fee2e2' : '#fef3c7' }]}>
                                    <Text style={[styles.statusText, { color: ticket.status === 'open' ? '#ef4444' : '#d97706' }]}>
                                        {ticket.status}
                                    </Text>
                                </View>
                            </View>
                            <Text style={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Contact Options */}
            <View style={styles.contactRow}>
                <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('tel:+254706656544')}>
                    <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
                        <FontAwesome name="phone" size={24} color="#2089dc" />
                    </View>
                    <Text style={styles.contactText}>Call Us</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('mailto:muneneoscar599@gmail.com')}>
                    <View style={[styles.iconBox, { backgroundColor: '#FFF3E0' }]}>
                        <FontAwesome name="envelope" size={24} color="#FF9800" />
                    </View>
                    <Text style={styles.contactText}>Email</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.contactItem} onPress={() => Linking.openURL('whatsapp://send?phone=+254706656544')}>
                    <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
                        <FontAwesome name="comments" size={24} color="#4CAF50" />
                    </View>
                    <Text style={styles.contactText}>Live Chat</Text>
                </TouchableOpacity>
            </View>

            {/* Ticket Form */}
            <View style={styles.formCard}>
                <Text style={styles.formTitle}>Raise a Ticket</Text>

                <Text style={styles.label}>Subject</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., No Internet Connection"
                    value={subject}
                    onChangeText={setSubject}
                />

                <Text style={styles.label}>Describe your issue</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Tell us more about the problem..."
                    multiline
                    numberOfLines={4}
                    value={message}
                    onChangeText={setMessage}
                    textAlignVertical="top"
                />

                <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTicket}>
                    <Text style={styles.submitButtonText}>Submit Ticket</Text>
                </TouchableOpacity>
            </View>

            {/* AI Chatbot Section */}
            <View style={styles.chatSection}>
                <Text style={styles.chatHeader}>Ask our AI Assistant</Text>

                <View style={styles.chatWindow}>
                    <ScrollView style={styles.chatHistory} nestedScrollEnabled={true}>
                        {chatMessages.map((msg, index) => (
                            <View key={index} style={[
                                styles.chatBubble,
                                msg.sender === 'user' ? styles.userBubble : styles.botBubble
                            ]}>
                                <Text style={[
                                    styles.chatText,
                                    msg.sender === 'user' ? styles.userText : styles.botText
                                ]}>{msg.text}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <View style={styles.chatInputContainer}>
                        <TextInput
                            style={styles.chatInput}
                            placeholder="Type a question..."
                            value={userQuestion}
                            onChangeText={setUserQuestion}
                            onSubmitEditing={handleChatSubmit}
                        />
                        <TouchableOpacity style={styles.sendButton} onPress={handleChatSubmit}>
                            <FontAwesome name="paper-plane" size={16} color="#fff" />
                        </TouchableOpacity>
                    </View>
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
    header: {
        marginBottom: 24,
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
    ticketsSection: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        color: '#333',
    },
    ticketCard: {
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 12,
        marginBottom: 10,
        elevation: 1,
    },
    ticketHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    ticketSubject: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1e293b',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    ticketDate: {
        fontSize: 12,
        color: '#94a3b8',
    },
    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    contactItem: {
        alignItems: 'center',
        width: '30%',
    },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    contactText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 24,
        elevation: 2,
    },
    formTitle: {
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
    input: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        padding: 10,
        marginBottom: 15,
        backgroundColor: '#f9f9f9',
        fontSize: 16,
    },
    textArea: {
        height: 100,
    },
    submitButton: {
        backgroundColor: '#2089dc',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    faqSection: {
        marginBottom: 30,
    },
    faqHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    faqItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 8,
        marginBottom: 10,
    },
    faqQuestion: {
        fontSize: 16,
        color: '#333',
    },
    chatSection: {
        marginBottom: 30,
    },
    chatHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
    },
    chatWindow: {
        backgroundColor: '#fff',
        borderRadius: 12,
        height: 300,
        padding: 10,
        elevation: 2,
    },
    chatHistory: {
        flex: 1,
        marginBottom: 10,
    },
    chatBubble: {
        padding: 10,
        borderRadius: 10,
        marginBottom: 8,
        maxWidth: '80%',
    },
    userBubble: {
        backgroundColor: '#2089dc',
        alignSelf: 'flex-end',
        borderBottomRightRadius: 0,
    },
    botBubble: {
        backgroundColor: '#f1f1f1',
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 0,
    },
    chatText: {
        fontSize: 14,
    },
    userText: {
        color: '#fff',
    },
    botText: {
        color: '#333',
    },
    chatInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
    chatInput: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 8,
        marginRight: 10,
        color: '#333',
    },
    sendButton: {
        backgroundColor: '#2089dc',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
