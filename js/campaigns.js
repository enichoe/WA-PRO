// js/campaigns.js

let allCampaigns = [];
let allTemplates = [];

/**
 * Loads campaigns from Supabase
 */
async function loadCampaigns() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('campaigns')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        allCampaigns = data || [];
        renderCampaigns();
        updateSenderCampaigns();
    } catch (error) {
        console.error('Error loading campaigns:', error);
    }
}

/**
 * Renders campaigns grid
 */
function renderCampaigns() {
    const grid = document.getElementById('campaignsGrid');
    if (!grid) return;

    if (allCampaigns.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>No hay campañas creadas aún.</p></div>';
        return;
    }

    grid.innerHTML = allCampaigns.map(c => `
        <div class="campaign-card ${c.status}">
            <div class="card-status">${c.status.toUpperCase()}</div>
            <h3>${c.name}</h3>
            <p class="message-preview">${c.message.substring(0, 100)}${c.message.length > 100 ? '...' : ''}</p>
            <div class="campaign-stats">
                <div class="stat">
                    <span>${c.total_contacts || 0}</span>
                    <label>Total</label>
                </div>
                <div class="stat">
                    <span>${c.sent_count || 0}</span>
                    <label>Enviados</label>
                </div>
                <div class="stat">
                    <span>${c.error_count || 0}</span>
                    <label>Errores</label>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn-secondary" onclick="openCampaignModal('${c.id}')">Editar</button>
                <button class="btn-primary" onclick="showSection('sender'); selectCampaignForSending('${c.id}')">Enviar</button>
            </div>
        </div>
    `).join('');
}

/**
 * Saves a campaign
 */
async function saveCampaign(e) {
    if (e) e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const id = document.getElementById('campaignId').value;
    const name = document.getElementById('campaignName').value;
    const message = document.getElementById('campaignMessage').value;
    
    // Get selected contacts from the selector list
    const selectedCheckboxes = document.querySelectorAll('#campaignContactList .contact-checkbox:checked');
    const contactIds = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (contactIds.length === 0) {
        showToast('Debes seleccionar al menos un contacto', 'warning');
        return;
    }

    showLoading(true, 'Guardando campaña...');

    try {
        let campaignId = id;
        const campaignData = {
            user_id: user.id,
            name,
            message,
            total_contacts: contactIds.length,
            updated_at: new Date().toISOString()
        };

        if (id) {
            const { error } = await supabase.from('campaigns').update(campaignData).eq('id', id);
            if (error) throw error;
        } else {
            const { data, error } = await supabase.from('campaigns').insert([campaignData]).select();
            if (error) throw error;
            campaignId = data[0].id;
        }

        // Handle campaign_contacts relationship
        // In a real app, you'd handle diffs for updates, but for now we'll just insert pending ones for new campaigns
        if (!id) {
            const relations = contactIds.map(cid => ({
                campaign_id: campaignId,
                contact_id: cid,
                status: 'pending'
            }));
            const { error: relError } = await supabase.from('campaign_contacts').insert(relations);
            if (relError) throw relError;
        }

        showToast(id ? 'Campaña actualizada' : 'Campaña creada', 'success');
        closeCampaignModal();
        loadCampaigns();
    } catch (error) {
        console.error('Error saving campaign:', error);
        showToast('Error al guardar campaña', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Loads templates from Supabase
 */
async function loadTemplates() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
        const { data, error } = await supabase
            .from('message_templates')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        allTemplates = data || [];
        renderTemplates();
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

/**
 * Renders templates grid
 */
function renderTemplates() {
    const grid = document.getElementById('templatesGrid');
    if (!grid) return;

    grid.innerHTML = allTemplates.map(t => `
        <div class="template-card">
            <h3>${t.name}</h3>
            <p>${t.message}</p>
            <div class="card-actions">
                <button class="btn-secondary" onclick="useTemplate('${t.id}')">Usar</button>
                <button class="btn-icon" onclick="openTemplateModal('${t.id}')">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Modal logic for campaigns
 */
function openCampaignModal(id = null) {
    const modal = document.getElementById('campaignModal');
    const form = document.getElementById('campaignForm');
    
    form.reset();
    document.getElementById('campaignId').value = id || '';
    document.getElementById('campaignModalTitle').textContent = id ? 'Editar Campaña' : 'Nueva Campaña';
    
    loadContactsForSelector(id);
    modal.classList.remove('hidden');
}

function closeCampaignModal() {
    document.getElementById('campaignModal').classList.add('hidden');
}

/**
 * Populates contact selector in campaign modal
 */
async function loadContactsForSelector(campaignId = null) {
    const list = document.getElementById('campaignContactList');
    if (!list) return;

    // In a real app, if editing, we'd fetch current selected contacts
    list.innerHTML = window.allContacts.map(c => `
        <div class="contact-selector-item">
            <label class="checkbox-wrapper">
                <input type="checkbox" class="contact-checkbox" value="${c.id}">
                <span class="checkmark"></span>
                <span class="contact-name">${c.name} (${c.phone})</span>
            </label>
        </div>
    `).join('');
}

// Global exposure
window.loadCampaigns = loadCampaigns;
window.saveCampaign = saveCampaign;
window.openCampaignModal = openCampaignModal;
window.closeCampaignModal = closeCampaignModal;
window.loadTemplates = loadTemplates;

// Init
document.addEventListener('DOMContentLoaded', () => {
    const campaignForm = document.getElementById('campaignForm');
    if (campaignForm) campaignForm.addEventListener('submit', saveCampaign);
});