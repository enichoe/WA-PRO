// js/auth.js

/**
 * Handles user authentication state and profile
 */
async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
        console.error('Error checking session:', error);
        return null;
    }

    if (!session) {
        // If we are on index.html and it's acting as the dashboard, 
        // we might want to redirect to a login page if one exists.
        // For now, since index.html IS the dashboard, we check if we're "logged in".
        console.warn('No active session found.');
        return null;
    }

    // Load profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error('Error loading profile:', profileError);
    }

    updateUIWithUser(session.user, profile);
    return session.user;
}

/**
 * Updates the UI with user data
 */
function updateUIWithUser(user, profile) {
    const userNameElem = document.getElementById('userName');
    const userAvatarElem = document.getElementById('userAvatar');
    const settingsEmail = document.getElementById('settingsEmail');
    const settingsName = document.getElementById('settingsName');
    const settingsCompany = document.getElementById('settingsCompany');

    const name = profile?.full_name || user.email.split('@')[0];
    
    if (userNameElem) userNameElem.textContent = name;
    if (userAvatarElem) userAvatarElem.innerHTML = `<span>${name.charAt(0).toUpperCase()}</span>`;
    
    if (settingsEmail) settingsEmail.value = user.email;
    if (settingsName) settingsName.value = profile?.full_name || '';
    if (settingsCompany) settingsCompany.value = profile?.company || '';
    
    // Update plan info
    const planElem = document.querySelector('.user-plan');
    if (planElem && profile) {
        planElem.textContent = `Plan ${profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}`;
    }
}

/**
 * Logs out the user
 */
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.reload();
    } catch (error) {
        showToast('Error al cerrar sesión', 'error');
    }
}

/**
 * Updates profile settings
 */
async function updateProfile(e) {
    if (e) e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const name = document.getElementById('settingsName').value;
    const company = document.getElementById('settingsCompany').value;

    showLoading(true, 'Guardando cambios...');
    
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                full_name: name, 
                company: company,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) throw error;
        showToast('Perfil actualizado correctamente', 'success');
        updateUIWithUser(user, { full_name: name, company: company });
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Error al actualizar perfil', 'error');
    } finally {
        showLoading(false);
    }
}

// Global exposure
window.logout = logout;
window.updateProfile = updateProfile;

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', updateProfile);
    }
});