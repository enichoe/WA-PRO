// js/app.js

/**
 * Main Application Hub
 */

// Section display names in Spanish
const SECTION_NAMES = {
    dashboard: 'Dashboard',
    contacts: 'Contactos',
    import: 'Importar Excel',
    campaigns: 'Campañas',
    sender: 'Enviar Mensajes',
    history: 'Historial',
    templates: 'Plantillas',
    settings: 'Configuración'
};

// Navigation logic
function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(s => s.classList.remove('active'));
    
    const target = document.getElementById(`section-${sectionId}`);
    if (target) {
        target.classList.add('active');
        const title = SECTION_NAMES[sectionId] || (sectionId.charAt(0).toUpperCase() + sectionId.slice(1));
        document.getElementById('pageTitle').textContent = title;
        
        // Update nav active state
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.getAttribute('data-section') === sectionId) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // Auto-close sidebar on mobile after navigation
    if (window.innerWidth <= 992) {
        closeMobileSidebar();
    }

    // Load section specialized data
    if (sectionId === 'contacts') loadContacts();
    if (sectionId === 'campaigns') loadCampaigns();
    if (sectionId === 'dashboard') updateDashboardStats();
    if (sectionId === 'templates') loadTemplates();
    if (sectionId === 'sender') updateSenderCampaigns();
}

/**
 * Updates Dashboard statistics
 */
async function updateDashboardStats() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data, error } = await supabase.rpc('get_dashboard_stats', { p_user_id: user.id });
        if (error) throw error;

        if (data) {
            document.getElementById('statContacts').textContent = data.total_contacts || 0;
            document.getElementById('statCampaigns').textContent = data.total_campaigns || 0;
            document.getElementById('statMessages').textContent = data.messages_sent || 0;
            document.getElementById('statActive').textContent = data.active_campaigns || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * UI Utilities (Toasts & Loading)
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function showLoading(show, text = 'Cargando...') {
    const overlay = document.getElementById('loadingOverlay');
    if (!overlay) return;
    
    const textElem = document.getElementById('loadingText');
    if (textElem) textElem.textContent = text;
    
    if (show) {
        overlay.classList.remove('hidden');
    } else {
        overlay.classList.add('hidden');
    }
}

// Sidebar toggle - handles both desktop (collapsed) and mobile (open)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth <= 992) {
        // Mobile: toggle 'open' class
        const isOpen = sidebar.classList.toggle('open');
        // Show/hide overlay
        const overlay = document.getElementById('sidebarOverlay');
        if (overlay) {
            overlay.classList.toggle('active', isOpen);
        }
    } else {
        // Desktop: toggle 'collapsed' class
        sidebar.classList.toggle('collapsed');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('open');
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) overlay.classList.remove('active');
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initial load
    const hash = window.location.hash.substring(1) || 'dashboard';
    showSection(hash);

    // Navigation listener for hash changes
    window.addEventListener('hashchange', () => {
        const newHash = window.location.hash.substring(1) || 'dashboard';
        showSection(newHash);
    });
    
    // Global search listener
    const search = document.getElementById('globalSearch');
    if (search) {
        search.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                showSection('contacts');
                document.getElementById('contactSearch').value = search.value;
                filterContacts();
            }
        });
    }

    // Sidebar overlay click closes sidebar on mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeMobileSidebar);
    }
});

// Expose globals
window.showSection = showSection;
window.showToast = showToast;
window.showLoading = showLoading;
window.toggleSidebar = toggleSidebar;
window.updateDashboardStats = updateDashboardStats;