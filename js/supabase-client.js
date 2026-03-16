// js/supabase-client.js

// CONFIGURATION: Replace these with your real Supabase credentials
// These should normally be in environment variables if using a builder,
// but for Vanilla JS we use a config object.
const SUPABASE_CONFIG = {
    url: 'https://nxypbmmfhqowklezthsq.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eXBibW1maHFvd2tsZXp0aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTk0NzAsImV4cCI6MjA4OTI3NTQ3MH0.XDSp2EVr68lppXqo39rSyyAHocsRrOx7bpOhNu9hnrk'
};

let supabase = null;

/**
 * Initializes the Supabase client
 * @returns {object} The supabase client instance
 */
function initSupabase() {
    if (supabase) return supabase;
    
    if (typeof supabasejs === 'undefined') {
        console.error('Supabase library not loaded. Check your script tag in index.html');
        return null;
    }

    try {
        const { createClient } = supabasejs;
        supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        return supabase;
    } catch (error) {
        console.error('Error creating Supabase client:', error);
        return null;
    }
}

// Global accessor
window.supabase = initSupabase();
window.initSupabase = initSupabase;