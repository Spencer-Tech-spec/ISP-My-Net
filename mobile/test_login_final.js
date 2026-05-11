const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testLogin() {
    const email = 'muneneoscar599@gmail.com';
    const password = '@Oscar599';

    console.log(`Testing login for: ${email}...`);

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        console.error("Login Test Failed:", error.message);
    } else {
        console.log("LOGIN SUCCESSFUL!");
        console.log("User ID:", data.user.id);

        // Now let's see if we can create a profile if it doesn't exist
        console.log("Checking for profile...");
        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (!profile) {
            console.log("No profile found. Creating one...");
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: data.user.id,
                        full_name: 'Micheni Oscar',
                        email: email,
                        role: 'admin',
                        plan: 'Admin',
                        status: 'Active'
                    }
                ]);
            if (profileError) console.error("Error creating profile:", profileError.message);
            else console.log("Profile created successfully!");
        } else {
            console.log("Profile already exists.");
        }
    }
}

testLogin();
