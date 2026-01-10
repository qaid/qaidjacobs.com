/**
 * CMS Main Logic
 * Orchestrates the CMS interface
 */

import { API } from './api.js';

// State
let currentType = 'essays';
let allNodes = [];
let editingId = null;

// DOM Elements
const contentTypeButtons = document.querySelectorAll('.type-btn');
const contentList = document.getElementById('content-list');
const editSection = document.getElementById('edit-section');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const btnCreate = document.getElementById('btn-create');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');

// Initialize
init();

async function init() {
  // Load initial data
  await loadContent();

  // Event listeners
  contentTypeButtons.forEach(btn => {
    btn.addEventListener('click', () => handleTypeChange(btn.dataset.type));
  });

  btnCreate.addEventListener('click', () => showCreateForm());
  btnSave.addEventListener('click', () => handleSave());
  btnCancel.addEventListener('click', () => hideEditForm());
}

async function loadContent() {
  try {
    const result = await API.getNodes();
    allNodes = result.data || [];
    renderContentList();
  } catch (error) {
    showNotification('error', `Failed to load content: ${error.message}`);
  }
}

function handleTypeChange(type) {
  currentType = type;

  // Update active button
  contentTypeButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.type === type);
  });

  // Update title
  document.getElementById('content-type-title').textContent =
    type.charAt(0).toUpperCase() + type.slice(1);

  // Render filtered list
  renderContentList();

  // Hide edit form
  hideEditForm();
}

function renderContentList() {
  const filtered = allNodes.filter(node => {
    if (currentType === 'essays') return node.type === 'essay';
    if (currentType === 'curiosities') return node.type === 'curiosity';
    if (currentType === 'durational') return node.type === 'durational';
    if (currentType === 'music') return node.type === 'music';
    if (currentType === 'movement') return node.type === 'movement';
    if (currentType === 'bio') return node.type === 'bio';
    return false;
  });

  if (filtered.length === 0) {
    contentList.innerHTML = '<p class="empty-state">No items found. Create your first one!</p>';
    return;
  }

  contentList.innerHTML = filtered.map(node => `
    <div class="content-card" data-id="${node.id}">
      <div class="content-card-header">
        <h3>${node.title}</h3>
        <span class="type-badge">${node.type}</span>
      </div>
      <div class="content-card-meta">
        ${node.description || ''}
        <br>
        Position: (${node.x}, ${node.y}) | Threads: ${node.threads.join(', ')}
      </div>
      <div class="content-card-actions">
        <button class="btn btn-secondary btn-edit" onclick="window.editNode('${node.id}')">Edit</button>
        <button class="btn btn-danger btn-delete" onclick="window.deleteNode('${node.id}')">Delete</button>
      </div>
    </div>
  `).join('');
}

function showCreateForm() {
  editingId = null;
  editTitle.textContent = `Create New ${currentType.slice(0, -1)}`;
  editSection.classList.remove('hidden');

  // Generate form based on type
  if (currentType === 'essays') {
    editForm.innerHTML = `
      <div class="form-group">
        <label for="node-id">ID *</label>
        <input type="text" id="node-id" required pattern="[a-z0-9-]+" placeholder="my-essay-id">
        <small>Lowercase alphanumeric with hyphens</small>
      </div>

      <div class="form-group">
        <label for="node-title">Title *</label>
        <input type="text" id="node-title" required>
      </div>

      <div class="form-group">
        <label for="node-description">Description</label>
        <input type="text" id="node-description">
      </div>

      <div class="form-group">
        <label for="essay-file">Essay File *</label>
        <input type="text" id="essay-file" required pattern="[a-z0-9-]+\\.md" placeholder="my-essay.md">
        <small>Must end in .md</small>
      </div>

      <div class="form-group">
        <label for="essay-content">Essay Content (Markdown) *</label>
        <textarea id="essay-content" required></textarea>
      </div>

      <div class="form-group">
        <label>Threads *</label>
        <div class="checkbox-group">
          <label><input type="checkbox" name="threads" value="music"> Music</label>
          <label><input type="checkbox" name="threads" value="movement"> Movement</label>
          <label><input type="checkbox" name="threads" value="questions" checked> Questions</label>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="node-x">X Position (0-100)</label>
          <input type="number" id="node-x" min="0" max="100" value="50">
        </div>
        <div class="form-group">
          <label for="node-y">Y Position (0-100)</label>
          <input type="number" id="node-y" min="0" max="100" value="50">
        </div>
      </div>

      <div class="form-group">
        <label><input type="checkbox" id="visible-on-landing" checked> Visible on landing page</label>
      </div>

      <div class="form-group">
        <label for="node-created">Created Date</label>
        <input type="date" id="node-created">
      </div>
    `;
  } else {
    editForm.innerHTML = '<p>Form for ' + currentType + ' coming soon...</p>';
  }

  editForm.scrollIntoView({ behavior: 'smooth' });
}

async function handleSave() {
  try {
    if (currentType === 'essays') {
      const id = document.getElementById('node-id').value;
      const title = document.getElementById('node-title').value;
      const description = document.getElementById('node-description').value;
      const essayFile = document.getElementById('essay-file').value;
      const essayContent = document.getElementById('essay-content').value;
      const x = parseInt(document.getElementById('node-x').value);
      const y = parseInt(document.getElementById('node-y').value);
      const visibleOnLanding = document.getElementById('visible-on-landing').checked;
      const created = document.getElementById('node-created').value;

      const threads = Array.from(document.querySelectorAll('input[name="threads"]:checked'))
        .map(cb => cb.value);

      const node = {
        id,
        title,
        type: 'essay',
        description,
        essayFile,
        threads,
        visible_on_landing: visibleOnLanding,
        x,
        y,
        ...(created && { created }),
      };

      const result = await API.createNode({ node, essayContent });
      showNotification('success', result.message || 'Essay created successfully');

      // Reload content
      await loadContent();
      hideEditForm();
    }
  } catch (error) {
    showNotification('error', `Save failed: ${error.message}`);
  }
}

function hideEditForm() {
  editSection.classList.add('hidden');
  editForm.innerHTML = '';
  editingId = null;
}

// Global functions for inline onclick
window.editNode = async function(id) {
  // TODO: Implement edit
  showNotification('info', 'Edit functionality coming soon');
};

window.deleteNode = async function(id) {
  if (!confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
    return;
  }

  try {
    const result = await API.deleteNode(id);
    showNotification('success', result.message || 'Deleted successfully');
    await loadContent();
  } catch (error) {
    showNotification('error', `Delete failed: ${error.message}`);
  }
};

// Notifications
function showNotification(type, message) {
  const notifications = document.getElementById('notifications');
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;

  notifications.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}
