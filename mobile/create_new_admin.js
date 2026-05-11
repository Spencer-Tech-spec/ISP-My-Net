const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createNewAdmin() {
    const newEmail = 'oscar@mynet.com';
    const newPassword = '@Oscar599';

    console.log(`Registering NEW admin user: ${newEmail}...`);

    const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
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
        console.log("SUCCESS! New Admin registered locally.");
        console.log("Login Email:", newEmail);
        console.log("Login Password:", newPassword);
        console.log("------------------------------------------");
        console.log("NOTE: Since this is a fake email, you might still need to skip verification.");
        console.log("I will now update the dashboard to allow this email automatically.");
    }
}

createNewAdmin();
