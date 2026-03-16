// js/excel-import.js

let importData = [];
let headers = [];

/**
 * Handles file selection and parsing
 */
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Convert to JSON
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (json.length < 2) {
            showToast('El archivo está vacío o no tiene suficientes filas', 'error');
            return;
        }

        headers = json[0];
        importData = json.slice(1).map(row => {
            const obj = {};
            headers.forEach((h, i) => {
                obj[h] = row[i];
            });
            return obj;
        });

        showImportPreview();
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Shows the mapping and preview UI
 */
function showImportPreview() {
    const preview = document.getElementById('importPreview');
    const dropzone = document.getElementById('dropzone');
    
    dropzone.classList.add('hidden');
    preview.classList.remove('hidden');

    document.getElementById('fileName').textContent = document.getElementById('fileInput').files[0].name;
    document.getElementById('previewCount').textContent = `(${importData.length} filas)`;

    // Populate mapping selects
    const selects = ['mapName', 'mapPhone', 'mapCompany', 'mapTag'];
    selects.forEach(s => {
        const select = document.getElementById(s);
        select.innerHTML = '<option value="">-- Seleccionar Columna --</option>' + 
            headers.map(h => `<option value="${h}">${h}</option>`).join('');
        
        // Auto-mapping attempt
        const lowerH = headers.map(h => h.toLowerCase());
        if (s === 'mapName') {
            const idx = lowerH.findIndex(h => h.includes('nombre') || h.includes('name'));
            if (idx !== -1) select.value = headers[idx];
        } else if (s === 'mapPhone') {
            const idx = lowerH.findIndex(h => h.includes('telefono') || h.includes('tel') || h.includes('phone'));
            if (idx !== -1) select.value = headers[idx];
        } else if (s === 'mapCompany') {
            const idx = lowerH.findIndex(h => h.includes('empresa') || h.includes('company'));
            if (idx !== -1) select.value = headers[idx];
        }
    });

    renderPreviewTable();
}

/**
 * Renders a sample of the imported data
 */
function renderPreviewTable() {
    const head = document.getElementById('previewHead');
    const body = document.getElementById('previewBody');
    
    head.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    
    const sample = importData.slice(0, 5);
    body.innerHTML = sample.map(row => `
        <tr>${headers.map(h => `<td>${row[h] || ''}</td>`).join('')}</tr>
    `).join('');
}

/**
 * Finalizes import to Supabase
 */
async function importContacts() {
    const map = {
        name: document.getElementById('mapName').value,
        phone: document.getElementById('mapPhone').value,
        company: document.getElementById('mapCompany').value,
        tag: document.getElementById('mapTag').value
    };

    if (!map.phone) {
        showToast('Debes mapear la columna de Teléfono', 'warning');
        return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    showLoading(true, `Importando ${importData.length} contactos...`);

    const contactsToInsert = importData.map(row => ({
        user_id: user.id,
        name: row[map.name] || 'Sin Nombre',
        phone: normalizePhone(String(row[map.phone] || '')),
        company: row[map.company] || null,
        tag: row[map.tag] || 'Excel Import',
        created_at: new Date().toISOString()
    })).filter(c => c.phone.length > 5); // Basic validation

    try {
        const { error } = await supabase.from('contacts').insert(contactsToInsert);
        if (error) throw error;

        showToast(`${contactsToInsert.length} contactos importados correctamente`, 'success');
        clearImport();
        showSection('contacts');
        loadContacts();
    } catch (error) {
        console.error('Error importing:', error);
        showToast('Error al importar contactos', 'error');
    } finally {
        showLoading(false);
    }
}

function clearImport() {
    importData = [];
    headers = [];
    document.getElementById('fileInput').value = '';
    document.getElementById('importPreview').classList.add('hidden');
    document.getElementById('dropzone').classList.remove('hidden');
}

/**
 * Normalizes phone numbers (same as in contacts.js)
 */
function normalizePhone(phone) {
    return phone.replace(/[^0-9+]/g, '');
}

// Global exposure
window.importContacts = importContacts;
window.clearImport = clearImport;

// Init
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.addEventListener('change', handleFileSelect);
    
    // Dropzone drag & drop support
    const dropzone = document.getElementById('dropzone');
    if (dropzone) {
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFileSelect({ target: fileInput });
            }
        });
    }
});