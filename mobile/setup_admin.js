const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupAdmin() {
    console.log("=".repeat(60));
    console.log("MY NET - Admin User Setup");
    console.log("=".repeat(60));

    // Admin credentials
    const adminEmail = 'muneneoscar599@gmail.com';
    const adminPassword = '@Oscar599';
    const adminName = 'Micheni Oscar';

    console.log("\n📝 Creating admin user...");
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Name: ${adminName}`);

    // Sign up the admin user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: adminEmail,
        password: adminPassword,
        options: {
            data: {
                full_name: adminName,
                role: 'admin'
            },
            emailRedirectTo: undefined // Disable email confirmation for testing
        }
    });

    if (signUpError) {
        console.error("\n❌ Error creating admin:", signUpError.message);

        // If user already exists, try to sign in
        if (signUpError.message.includes('already registered')) {
            console.log("\n🔄 User already exists. Attempting to sign in...");

            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: adminEmail,
                password: adminPassword,
            });

            if (signInError) {
                console.error("❌ Sign in failed:", signInError.message);
                console.log("\n💡 Possible solutions:");
                console.log("   1. Check if email needs verification in Supabase dashboard");
                console.log("   2. Verify password is correct");
                console.log("   3. Check Supabase Auth settings for email confirmation");
            } else {
                console.log("\n✅ Sign in successful!");
                console.log("   User ID:", signInData.user.id);
                console.log("   Email:", signInData.user.email);
                console.log("\n🎉 You can now use these credentials in the mobile app!");
            }
        }
    } else {
        console.log("\n✅ Admin user created successfully!");
        console.log("   User ID:", signUpData.user?.id);
        console.log("   Email:", signUpData.user?.email);

        // Check if email confirmation is required
        if (signUpData.user && !signUpData.user.confirmed_at) {
            console.log("\n⚠️  Email confirmation required!");
            console.log("   Please check your inbox for verification email.");
            console.log("\n💡 To disable email confirmation:");
            console.log("   1. Go to Supabase Dashboard → Authentication → Settings");
            console.log("   2. Disable 'Enable email confirmations'");
        } else {
            console.log("\n🎉 Account is ready to use!");
        }
    }

    console.log("\n" + "=".repeat(60));
    console.log("CREDENTIALS FOR LOGIN:");
    console.log("=".repeat(60));
    console.log(`Email:    ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log("=".repeat(60));
}

setupAdmin();
