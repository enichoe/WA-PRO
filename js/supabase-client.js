// js/supabase-client.js

// CONFIGURATION
const SUPABASE_CONFIG = {
    url: 'https://nxypbmmfhqowklezthsq.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eXBibW1maHFvd2tsZXp0aHNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2OTk0NzAsImV4cCI6MjA4OTI3NTQ3MH0.XDSp2EVr68lppXqo39rSyyAHocsRrOx7bpOhNu9hnrk'
};

// Use a private internal variable to avoid conflicts with the global 'supabase' from the CDN
let _supabaseInstance = null;

/**
 * Initializes the Supabase client
 * @returns {object} The supabase client instance
 */
function initSupabase() {
    if (_supabaseInstance) return _supabaseInstance;
    
    // The library is usually at window.supabase when loaded via CDN
    // We need to capture the library reference before we potentially overwrite the global name
    const lib = window.supabasejs || window.supabase;
    
    if (!lib || !lib.createClient) {
        console.error('Supabase library not found. Ensure the CDN script is loaded before this one.');
        return null;
    }

    try {
        _supabaseInstance = lib.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        return _supabaseInstance;
    } catch (error) {
        console.error('Error creating Supabase client:', error);
        return null;
    }
}

// Initialize and export as 'supabase' for other scripts to use
// We attach it to window so it's globally available
window.supabase = initSupabase();
window.initSupabase = initSupabase;