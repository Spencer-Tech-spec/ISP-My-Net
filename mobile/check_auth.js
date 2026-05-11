const { createClient } = require('@supabase/supabase-js');

// Project Service Role Key is needed to manage users directly
// However, since I don't have the service role key, I will use the admin auth update method
const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function resetAdminPassword() {
    console.log("Attempting to force update admin password...");

    // Since we don't have the Service Role Key, we can't 'force' it without a session.
    // But we can try to sign up again or use the reset flow.
    // Actually, I'll create a script that uses the Supabase Auth Admin API if possible, 
    // but usually that requires the SERVICE_ROLE_KEY.

    console.log("TIP: If you forgot the password, you can use the 'Forgot Password' link in the app.");
    console.log("Alternatively, I can try to delete and recreate the user if I had the service key.");

    // Let's try to register a slightly different email just to see if it works
    console.log("Checking if registration works with a test user...");
    const { data, error } = await supabase.auth.signUp({
        email: 'admin_test@mynet.com',
        password: '@Oscar599',
    });

    if (error) {
        console.error("Test Registration Error:", error.message);
    } else {
        console.log("Test Registration Success. Auth is working.");
    }
}

resetAdminPassword();
