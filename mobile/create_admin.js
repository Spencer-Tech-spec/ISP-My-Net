const { createClient } = require('@supabase/supabase-js');

// Using the keys from mobile/lib/supabase.js
const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
    console.log("Registering admin user...");

    const { data, error } = await supabase.auth.signUp({
        email: 'muneneoscar599@gmail.com',
        password: '@Oscar599',
        options: {
            data: {
                full_name: 'Micheni Oscar',
                role: 'admin'
            }
        }
    });

    if (error) {
        console.error("Error creating admin:", error.message);
    } else {
        console.log("Admin registration successful!");
        console.log("User Email:", data.user.email);
        console.log("NOTE: Please check your email inbox to verify the account before logging in.");
    }
}

createAdmin();
