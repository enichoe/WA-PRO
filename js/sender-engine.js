// js/sender-engine.js

let queue = [];
let isSending = false;
let isPaused = false;
let currentIdx = 0;
let sendingConfig = {
    delay: 5,
    batchSize: 50,
    batchPause: 60
};

/**
 * Prepares the queue for sending
 */
async function selectCampaignForSending(campaignId) {
    const select = document.getElementById('senderCampaign');
    if (select) select.value = campaignId;
    loadCampaignContacts();
}

/**
 * Loads contacts of the selected campaign for the sender view
 */
async function loadCampaignContacts() {
    const campaignId = document.getElementById('senderCampaign').value;
    if (!campaignId) return;

    const { data: campaign } = await supabase.from('campaigns').select('*').eq('id', campaignId).single();
    if (campaign) {
        document.getElementById('senderMessage').value = campaign.message;
        sendingConfig.delay = campaign.delay_seconds || 5;
        document.getElementById('senderDelay').value = sendingConfig.delay;
    }

    const { data: contacts, error } = await supabase
        .from('campaign_contacts')
        .select('*, contacts(*)')
        .eq('campaign_id', campaignId)
        .eq('status', 'pending');

    if (error) {
        console.error('Error loading campaign contacts:', error);
        return;
    }

    queue = contacts || [];
    renderRecipientsTable();
    updateSenderStats();
    
    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.disabled = queue.length === 0;
}

/**
 * Renders the preview table
 */
function renderRecipientsTable() {
    const body = document.getElementById('recipientsTable');
    const container = document.getElementById('recipientsSection');
    
    if (!body) return;
    
    container.classList.remove('hidden');
    document.getElementById('recipientsCount').textContent = queue.length;

    body.innerHTML = queue.map(item => `
        <tr>
            <td>${item.contacts.name}</td>
            <td>${item.contacts.phone}</td>
            <td>${item.contacts.company || '-'}</td>
            <td class="msg-preview">${replaceVariables(document.getElementById('senderMessage').value, item.contacts)}</td>
            <td><span class="badge ${item.status}">${item.status}</span></td>
        </tr>
    `).join('');
}

/**
 * Core Sending Logic
 */
async function startSending() {
    if (isSending) return;
    
    isSending = true;
    isPaused = false;
    currentIdx = 0;
    
    document.getElementById('senderProgress').classList.remove('hidden');
    document.getElementById('senderActions').classList.add('hidden');
    
    processQueue();
}

async function processQueue() {
    if (isPaused || currentIdx >= queue.length) {
        if (currentIdx >= queue.length) finishSending();
        return;
    }

    const item = queue[currentIdx];
    updateCurrentProgress(item);

    // CRITICAL: window.open logic
    // Modern browsers block window.open inside async functions or loops.
    // SOLUTION: The first window.open MUST be triggered by the user (the "Start" button click).
    // For subsequent ones, we have 2 choices:
    // 1. Suggest the user to "Allow Pop-ups" (Standard for these apps).
    // 2. Use a "Manual Trigger" if blocked.
    
    const message = replaceVariables(document.getElementById('senderMessage').value, item.contacts);
    const waUrl = `https://wa.me/${item.contacts.phone}?text=${encodeURIComponent(message)}`;
    
    const win = window.open(waUrl, '_blank');
    
    if (!win || win.closed || typeof win.closed === 'undefined') {
        // BLOCKED BY POPUP BLOCKER
        showToast('Ventana bloqueada. Por favor permite los pop-ups para automatizar el envío.', 'warning');
        pauseSending();
        // Show a "Retry/Continue" button specifically for this
        return;
    }

    // Update Supabase
    await supabase.from('campaign_contacts')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id);

    currentIdx++;
    updateSenderStats();

    // Delay with batch logic
    let delay = sendingConfig.delay * 1000;
    if (currentIdx % sendingConfig.batchSize === 0) {
        delay = sendingConfig.batchPause * 1000;
        showToast(`Pausa de lote: esperando ${sendingConfig.batchPause}s`, 'info');
    }

    setTimeout(processQueue, delay);
}

function pauseSending() {
    isPaused = true;
    document.getElementById('pauseBtn').innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        <span>Reanudar</span>
    `;
    document.getElementById('pauseBtn').onclick = resumeSending;
}

function resumeSending() {
    isPaused = false;
    document.getElementById('pauseBtn').innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
        <span>Pausar</span>
    `;
    document.getElementById('pauseBtn').onclick = pauseSending;
    processQueue();
}

function stopSending() {
    if (!confirm('¿Detener el envío por completo?')) return;
    isSending = false;
    isPaused = true;
    finishSending();
}

function finishSending() {
    showToast('Envío finalizado', 'success');
    document.getElementById('senderProgress').classList.add('hidden');
    document.getElementById('senderActions').classList.remove('hidden');
    isSending = false;
    loadCampaigns(); // Refresh stats
}

/**
 * Utility: Replace variables in message
 */
function replaceVariables(text, contact) {
    return text
        .replace(/{nombre}/g, contact.name || '')
        .replace(/{empresa}/g, contact.company || '')
        .replace(/{telefono}/g, contact.phone || '');
}

function insertVariable(variable) {
    const textarea = document.getElementById('senderMessage');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + `{${variable}}` + text.substring(end);
    textarea.focus();
}

function updateSenderStats() {
    const sent = currentIdx;
    const pending = queue.length - sent;
    const progress = (sent / queue.length) * 100 || 0;

    document.getElementById('sentCount').textContent = sent;
    document.getElementById('pendingCount').textContent = pending;
    document.getElementById('progressPercent').textContent = `${Math.round(progress)}%`;
    document.getElementById('progressBar').querySelector('.progress-fill').style.width = `${progress}%`;
}

function updateCurrentProgress(item) {
    const container = document.getElementById('currentMessage');
    container.querySelector('.recipient-name').textContent = item.contacts.name;
}

// Global exposure
window.selectCampaignForSending = selectCampaignForSending;
window.loadCampaignContacts = loadCampaignContacts;
window.startSending = startSending;
window.pauseSending = pauseSending;
window.resumeSending = resumeSending;
window.stopSending = stopSending;
window.insertVariable = insertVariable;