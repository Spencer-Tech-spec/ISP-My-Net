const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    console.log("\n" + "=".repeat(70));
    console.log("MY NET - Testing Login with Admin Credentials");
    console.log("=".repeat(70));

    const testEmail = 'muneneoscar599@gmail.com';
    const testPassword = '@Oscar599';

    console.log(`\n🔐 Attempting to sign in...`);
    console.log(`   Email: ${testEmail}`);
    console.log(`   Password: ${testPassword}`);

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: testEmail,
            password: testPassword,
        });

        if (error) {
            console.log("\n❌ LOGIN FAILED");
            console.log("   Error:", error.message);
            console.log("\n📋 Error Details:");
            console.log("   Status:", error.status);
            console.log("   Name:", error.name);

            if (error.message.includes('Invalid login credentials')) {
                console.log("\n💡 Possible causes:");
                console.log("   1. Email not verified - Check your email inbox");
                console.log("   2. Wrong password");
                console.log("   3. User doesn't exist yet");
                console.log("\n🔧 Solutions:");
                console.log("   1. Run: node setup_admin.js (to create/verify user)");
                console.log("   2. Check Supabase Dashboard → Authentication → Users");
                console.log("   3. Disable email confirmation in Supabase settings");
            } else if (error.message.includes('Email not confirmed')) {
                console.log("\n💡 Email verification required!");
                console.log("   Go to: Supabase Dashboard → Authentication → Settings");
                console.log("   Disable: 'Enable email confirmations'");
            }
        } else {
            console.log("\n✅ LOGIN SUCCESSFUL!");
            console.log("\n👤 User Information:");
            console.log("   ID:", data.user.id);
            console.log("   Email:", data.user.email);
            console.log("   Email Confirmed:", data.user.email_confirmed_at ? "Yes" : "No");
            console.log("   Created:", new Date(data.user.created_at).toLocaleString());
            console.log("   Last Sign In:", new Date(data.user.last_sign_in_at).toLocaleString());

            if (data.user.user_metadata) {
                console.log("\n📝 User Metadata:");
                console.log("   Full Name:", data.user.user_metadata.full_name || "Not set");
                console.log("   Role:", data.user.user_metadata.role || "Not set");
            }

            console.log("\n🎉 You can now use these credentials in the mobile app!");
        }
    } catch (err) {
        console.log("\n❌ UNEXPECTED ERROR");
        console.log("   Message:", err.message);
        console.log("   Stack:", err.stack);
    }

    console.log("\n" + "=".repeat(70));
}

testLogin();
