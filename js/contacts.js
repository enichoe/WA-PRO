// js/contacts.js

let allContacts = [];
let currentPage = 1;
const itemsPerPage = 10;
let currentFilters = {
    search: '',
    tag: ''
};

/**
 * Loads contacts from Supabase
 */
async function loadContacts() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    showLoading(true, 'Cargando contactos...');
    
    try {
        const { data, error } = await supabase
            .from('contacts')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        allContacts = data || [];
        window.allContacts = allContacts; // Sync global reference
        renderContacts();
        updateTagsFilter();
        updateDashboardStats();
    } catch (error) {
        console.error('Error loading contacts:', error);
        showToast('Error al cargar contactos', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Renders contacts in the table
 */
function renderContacts() {
    const tableBody = document.getElementById('contactsTableBody');
    if (!tableBody) return;

    // Filter logic
    let filtered = allContacts.filter(c => {
        const searchMatch = !currentFilters.search || 
            (c.name?.toLowerCase().includes(currentFilters.search.toLowerCase()) || 
             c.phone?.includes(currentFilters.search) ||
             c.company?.toLowerCase().includes(currentFilters.search.toLowerCase()));
        
        const tagMatch = !currentFilters.tag || c.tag === currentFilters.tag;
        
        return searchMatch && tagMatch;
    });

    // Pagination logic
    const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    
    const start = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(start, start + itemsPerPage);

    tableBody.innerHTML = paginated.map(c => `
        <tr data-id="${c.id}">
            <td>
                <label class="checkbox-wrapper">
                    <input type="checkbox" class="contact-checkbox" value="${c.id}" onchange="updateSelectedCount()">
                    <span class="checkmark"></span>
                </label>
            </td>
            <td>${c.name}</td>
            <td>${c.phone}</td>
            <td>${c.company || '-'}</td>
            <td><span class="badge">${c.tag || '-'}</span></td>
            <td>${new Date(c.created_at).toLocaleDateString()}</td>
            <td>
                <div class="table-actions">
                    <button class="btn-icon" onclick="openContactModal('${c.id}')" title="Editar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button class="btn-icon danger" onclick="deleteContact('${c.id}')" title="Eliminar">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Update pagination info
    const info = document.getElementById('paginationInfo');
    if (info) info.textContent = `Página ${currentPage} de ${totalPages}`;
    
    const prevBtn = document.getElementById('prevPage');
    const nextBtn = document.getElementById('nextPage');
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
    
    const countElem = document.getElementById('contactsCount');
    if (countElem) countElem.textContent = `${filtered.length} contactos`;
}

/**
 * Saves a contact (Create/Update)
 */
async function saveContact(e) {
    if (e) e.preventDefault();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const id = document.getElementById('contactId').value;
    const contactData = {
        user_id: user.id,
        name: document.getElementById('contactName').value,
        phone: normalizePhone(document.getElementById('contactPhone').value),
        company: document.getElementById('contactCompany').value,
        tag: document.getElementById('contactTag').value,
        notes: document.getElementById('contactNotes').value,
        updated_at: new Date().toISOString()
    };

    try {
        let error;
        if (id) {
            ({ error } = await supabase.from('contacts').update(contactData).eq('id', id));
        } else {
            ({ error } = await supabase.from('contacts').insert([contactData]));
        }

        if (error) throw error;
        
        showToast(id ? 'Contacto actualizado' : 'Contacto creado', 'success');
        closeContactModal();
        loadContacts();
    } catch (error) {
        console.error('Error saving contact:', error);
        showToast('Error al guardar contacto', 'error');
    }
}

/**
 * Deletes a single contact
 */
async function deleteContact(id) {
    if (!confirm('¿Estás seguro de eliminar este contacto?')) return;

    try {
        const { error } = await supabase.from('contacts').delete().eq('id', id);
        if (error) throw error;
        
        showToast('Contacto eliminado', 'success');
        loadContacts();
    } catch (error) {
        showToast('Error al eliminar contacto', 'error');
    }
}

/**
 * Normalizes phone numbers - adds Peru +51 country code if missing
 * Accepts: 963258741 or +51963258741 or 51963258741
 */
function normalizePhone(phone) {
    // Remove all non-digit and non-plus characters
    let cleaned = phone.replace(/[^0-9+]/g, '');
    
    // Remove leading +
    if (cleaned.startsWith('+')) {
        cleaned = cleaned.substring(1);
    }
    
    // If number starts with 51 and has 11 digits, it's already with country code
    if (cleaned.startsWith('51') && cleaned.length === 11) {
        return '+' + cleaned;
    }
    
    // If number has 9 digits (Peruvian mobile), add +51
    if (cleaned.length === 9) {
        return '+51' + cleaned;
    }
    
    // If it has more digits but no country code (fallback), just add +
    if (!cleaned.startsWith('+')) {
        return '+' + cleaned;
    }
    
    return cleaned;
}

/**
 * Filter handlers
 */
function filterContacts() {
    currentFilters.search = document.getElementById('contactSearch')?.value || '';
    currentFilters.tag = document.getElementById('tagFilter')?.value || '';
    currentPage = 1;
    renderContacts();
}

function changePage(delta) {
    currentPage += delta;
    renderContacts();
}

/**
 * Modal logic
 */
function openContactModal(id = null) {
    const modal = document.getElementById('contactModal');
    const form = document.getElementById('contactForm');
    const title = document.getElementById('contactModalTitle');
    
    form.reset();
    document.getElementById('contactId').value = id || '';
    title.textContent = id ? 'Editar Contacto' : 'Nuevo Contacto';
    
    if (id) {
        const contact = allContacts.find(c => c.id === id);
        if (contact) {
            document.getElementById('contactName').value = contact.name;
            document.getElementById('contactPhone').value = contact.phone;
            document.getElementById('contactCompany').value = contact.company || '';
            document.getElementById('contactTag').value = contact.tag || '';
            document.getElementById('contactNotes').value = contact.notes || '';
        }
    }
    
    modal.classList.remove('hidden');
}

function closeContactModal() {
    document.getElementById('contactModal').classList.add('hidden');
}

/**
 * Bulk actions
 */
function toggleSelectAll() {
    const master = document.getElementById('selectAllContacts');
    const checkboxes = document.querySelectorAll('.contact-checkbox');
    checkboxes.forEach(cb => cb.checked = master.checked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const selected = document.querySelectorAll('.contact-checkbox:checked');
    const count = selected.length;
    
    const bulkActions = document.getElementById('bulkActions');
    const countLabel = document.getElementById('selectedCount');
    
    if (bulkActions) {
        if (count > 0) {
            bulkActions.classList.remove('hidden');
        } else {
            bulkActions.classList.add('hidden');
        }
    }
    
    if (countLabel) countLabel.textContent = `${count} seleccionados`;
}

// Global exposure
window.allContacts = allContacts;
window.loadContacts = loadContacts;
window.saveContact = saveContact;
window.deleteContact = deleteContact;
window.openContactModal = openContactModal;
window.closeContactModal = closeContactModal;
window.filterContacts = filterContacts;
window.changePage = changePage;
window.toggleSelectAll = toggleSelectAll;
window.updateSelectedCount = updateSelectedCount;

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) contactForm.addEventListener('submit', saveContact);
});