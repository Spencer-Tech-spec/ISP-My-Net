const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://asuxwdfunyfsymjhmexx.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFzdXh3ZGZ1bnlmc3ltamhtZXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzNjQ0MTIsImV4cCI6MjA4NTk0MDQxMn0.V54N2TpXBTycdk41bRTszEC4OFKHCCu4oIqyWO_r6ts';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkProfile() {
    console.log("Checking profiles table...");
    const { data, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error("Error fetching profiles:", error.message);
        if (error.message.includes("relation \"profiles\" does not exist")) {
            console.log("The 'profiles' table has not been created in your Supabase database yet.");
        }
    } else {
        console.log("Profiles found:", data.length);
        console.log(data);
    }
}

checkProfile();
