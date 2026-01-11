/**
 * CMS Main Logic
 * Orchestrates the CMS interface
 */

import { API } from './api.js';

// State
let currentType = 'essays';
let allNodes = [];
let editingId = null;
let currentView = 'cards'; // 'cards' or 'list'
let statusCheckInterval = null;
let currentTheme = 'light';

// DOM Elements
const contentTypeButtons = document.querySelectorAll('.type-btn');
const contentList = document.getElementById('content-list');
const editSection = document.getElementById('edit-section');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const btnCreate = document.getElementById('btn-create');
const btnSave = document.getElementById('btn-save');
const btnCancel = document.getElementById('btn-cancel');
const btnViewCards = document.getElementById('btn-view-cards');
const btnViewList = document.getElementById('btn-view-list');
const btnThemeToggle = document.getElementById('theme-toggle');

// Initialize theme BEFORE DOM loads to prevent flash
initTheme();

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

  btnViewCards.addEventListener('click', () => handleViewChange('cards'));
  btnViewList.addEventListener('click', () => handleViewChange('list'));
  btnThemeToggle.addEventListener('click', () => toggleTheme());

  // Sidebar resize functionality
  initSidebarResize();

  // Handle URL parameters for direct navigation to edit view
  await handleURLParams();

  // Start status monitoring
  startStatusMonitoring();

  // Enable transitions after initial load
  setTimeout(() => {
    document.body.classList.remove('no-transitions');
  }, 100);
}

async function handleURLParams() {
  const params = new URLSearchParams(window.location.search);
  const type = params.get('type');
  const id = params.get('id');

  if (type && id) {
    // Switch to the correct content type
    if (type !== currentType) {
      handleTypeChange(type);
    }

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 100));

    // Open the edit view for the specified item
    await window.editNode(id);
  }
}

function updateURL(type, id) {
  const url = new URL(window.location.href);
  if (type && id) {
    url.searchParams.set('type', type);
    url.searchParams.set('id', id);
  } else {
    url.searchParams.delete('type');
    url.searchParams.delete('id');
  }
  window.history.pushState({}, '', url);
}

// Sidebar resize functionality
function initSidebarResize() {
  const sidebar = document.getElementById('sidebar');
  const resizeHandle = document.getElementById('sidebar-resize-handle');
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  const minWidth = 120;
  const maxWidth = 500;

  // Restore saved width from localStorage
  const savedWidth = localStorage.getItem('cms-sidebar-width');
  if (savedWidth) {
    const width = parseInt(savedWidth);
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, width));
    sidebar.style.width = `${constrainedWidth}px`;
  }

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = sidebar.offsetWidth;
    resizeHandle.classList.add('resizing');
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - startX;
    const newWidth = startWidth + deltaX;

    // Respect min and max width
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    sidebar.style.width = `${constrainedWidth}px`;
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      resizeHandle.classList.remove('resizing');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';

      // Save the new width to localStorage
      localStorage.setItem('cms-sidebar-width', sidebar.offsetWidth.toString());
    }
  });
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

  // Handle special types (phrases, connections) separately
  if (type === 'phrases') {
    loadPhrases();
  } else if (type === 'connections') {
    loadConnections();
  } else {
    // Render filtered list for node types
    renderContentList();
  }

  // Hide edit form
  hideEditForm();
}

function handleViewChange(view) {
  currentView = view;

  // Update active button
  btnViewCards.classList.toggle('active', view === 'cards');
  btnViewList.classList.toggle('active', view === 'list');

  // Update list class
  if (view === 'list') {
    contentList.classList.add('list-view');
  } else {
    contentList.classList.remove('list-view');
  }
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
    <div class="content-card clickable" data-id="${node.id}" onclick="window.editNode('${node.id}')">
      <div class="content-card-header">
        <h3>${node.title}</h3>
        <span class="type-badge">${node.type}</span>
      </div>
      <div class="content-card-meta">
        ${node.type !== 'durational' && node.description ? node.description + '<br>' : ''}
        Position: Auto-assigned | Threads: ${node.threads.join(', ')}
      </div>
    </div>
  `).join('');
}

function showCreateForm() {
  editingId = null;

  // Determine the singular type name for display
  let typeName;
  if (currentType === 'essays') typeName = 'Essay';
  else if (currentType === 'curiosities') typeName = 'Curiosity';
  else if (currentType === 'durational') typeName = 'Durational';
  else if (currentType === 'music') typeName = 'Music';
  else if (currentType === 'movement') typeName = 'Movement';
  else typeName = currentType.charAt(0).toUpperCase() + currentType.slice(1, -1);

  editTitle.textContent = `Create New ${typeName}`;

  // Hide content list section when editing
  document.querySelector('.content-list-section').classList.add('hidden');
  editSection.classList.remove('hidden');

  // Determine node type
  let nodeType;
  if (currentType === 'essays') nodeType = 'essay';
  else if (currentType === 'curiosities') nodeType = 'curiosity';
  else if (currentType === 'durational') nodeType = 'durational';
  else nodeType = currentType.slice(0, -1);

  // Create empty node for the form
  const emptyNode = {
    id: '',
    title: '',
    type: nodeType,
    threads: currentType === 'essays' ? ['questions'] : currentType === 'music' ? ['music'] : currentType === 'movement' ? ['movement'] : ['questions'],
    x: 50,
    y: 50,
    visible_on_landing: true
  };

  showEditForm(emptyNode, '');
  editForm.scrollIntoView({ behavior: 'smooth' });

  // Focus the first input field after a brief delay to ensure DOM is ready
  setTimeout(() => {
    const firstInput = document.getElementById('node-id');
    if (firstInput) {
      firstInput.focus();
    }
  }, 100);
}

async function handleSave() {
  try {
    // Common fields
    const id = document.getElementById('node-id').value;
    const title = document.getElementById('node-title').value;
    const x = parseInt(document.getElementById('node-x').value);
    const y = parseInt(document.getElementById('node-y').value);
    const visibleOnLanding = document.getElementById('visible-on-landing').checked;
    const threads = Array.from(document.querySelectorAll('input[name="threads"]:checked'))
      .map(cb => cb.value);

    // Build node based on type
    let type;
    if (currentType === 'essays') type = 'essay';
    else if (currentType === 'curiosities') type = 'curiosity';
    else if (currentType === 'durational') type = 'durational';
    else type = currentType.slice(0, -1); // music -> music, movement -> movement, bio -> bio

    const node = { id, title, type, threads, visible_on_landing: visibleOnLanding, x, y };

    // Add type-specific fields
    const descriptionEl = document.getElementById('node-description');
    if (descriptionEl) node.description = descriptionEl.value;

    const subtypeEl = document.getElementById('node-subtype');
    if (subtypeEl) node.subtype = subtypeEl.value;

    // Essay-specific
    if (type === 'essay') {
      node.essayFile = document.getElementById('essay-file').value;
      const created = document.getElementById('node-created').value;
      if (created) node.created = created;
      var essayContent = document.getElementById('essay-content').value;
    }

    // Bio-specific
    if (type === 'bio') {
      node.bioText = document.getElementById('bio-text').value;
    }

    // Curiosity-specific
    let curiosityData = null;
    if (type === 'curiosity') {
      const isHub = document.getElementById('is-hub');
      if (isHub && isHub.checked) node.is_hub = true;

      // Collect curiosity data
      const centralTopic = document.getElementById('curiosity-central').value;

      // Collect connections
      const connectionRows = document.querySelectorAll('.connection-row');
      const connected = [];
      connectionRows.forEach(row => {
        const label = row.querySelector('.connection-label').value.trim();
        const linksTo = row.querySelector('.connection-url').value.trim();
        if (label) {
          connected.push({
            label,
            linksTo: linksTo || null
          });
        }
      });

      curiosityData = {
        id: id,
        title: title, // Use the main title field
        central: centralTopic || id,
        connected,
        threads: threads,
        visible_on_landing: visibleOnLanding
      };
    }

    // Durational-specific
    let durationalData = null;
    if (type === 'durational') {
      const mediaSource = document.getElementById('media-source')?.value;
      const mediaUrl = document.getElementById('media-url')?.value;
      const mediaDuration = document.getElementById('media-duration')?.value;
      const commentary = document.getElementById('durational-commentary')?.value;
      const created = document.getElementById('node-created')?.value;

      if (created) node.created = created;

      durationalData = {
        id: id,
        title: title,
        type: 'durational',
        subtype: node.subtype,
        description: node.description,
        media: {
          source: mediaSource || 'soundcloud',
          url: mediaUrl || '',
          duration: mediaDuration || ''
        },
        commentary: commentary || '',
        created: created,
        threads: threads
      };
    }

    let result;
    if (editingId) {
      // Update existing node
      if (type === 'essay') {
        result = await API.updateNode(editingId, { node, essayContent });
      } else if (type === 'curiosity') {
        result = await API.updateNode(editingId, { node, curiosityData });
      } else if (type === 'durational') {
        result = await API.updateNode(editingId, { node, durationalData });
      } else {
        result = await API.updateNode(editingId, { node });
      }
      showNotification('success', result.message || `${type} updated successfully`);
    } else {
      // Create new node
      if (type === 'essay') {
        result = await API.createNode({ node, essayContent });
      } else if (type === 'curiosity') {
        result = await API.createNode({ node, curiosityData });
      } else if (type === 'durational') {
        result = await API.createNode({ node, durationalData });
      } else {
        result = await API.createNode({ node });
      }
      showNotification('success', result.message || `${type} created successfully`);
    }

    // Reload content
    await loadContent();
    hideEditForm();
  } catch (error) {
    showNotification('error', `Save failed: ${error.message}`);
  }
}

function hideEditForm() {
  editSection.classList.add('hidden');
  editForm.innerHTML = '';
  editingId = null;

  // Clear URL parameters
  updateURL(null, null);

  // Show content list section again
  document.querySelector('.content-list-section').classList.remove('hidden');
}

async function showEditForm(node, essayContent = '') {
  // ID field (always the same)
  const idField = `
    <div class="form-group">
      <label for="node-id">ID *</label>
      <input type="text" id="node-id" required pattern="[a-z0-9-]+" value="${node.id || ''}" ${editingId ? 'disabled' : ''}>
      <small>Lowercase alphanumeric with hyphens${editingId ? ' (cannot be changed)' : ''}</small>
    </div>
  `;

  // Title field varies based on type
  let titleField;
  if (node.type === 'curiosity') {
    titleField = `
      <div class="form-group">
        <label for="node-title">Title *</label>
        <input type="text" id="node-title" required value="${node.title || ''}" placeholder="e.g., How is afrofuturism showing up in my life?">
        <small>The question or theme this curiosity addresses</small>
      </div>
    `;
  } else {
    titleField = `
      <div class="form-group">
        <label for="node-title">Title *</label>
        <input type="text" id="node-title" required value="${node.title || ''}">
      </div>
    `;
  }

  const commonFields = idField + titleField;

  const threadsField = `
    <div class="form-group">
      <label>Threads *</label>
      <div class="checkbox-group">
        <label><input type="checkbox" name="threads" value="music" ${node.threads?.includes('music') ? 'checked' : ''}> Music</label>
        <label><input type="checkbox" name="threads" value="movement" ${node.threads?.includes('movement') ? 'checked' : ''}> Movement</label>
        <label><input type="checkbox" name="threads" value="questions" ${node.threads?.includes('questions') ? 'checked' : ''}> Questions</label>
      </div>
    </div>
  `;

  const positionFields = `
    <div class="form-group">
      <label>Position</label>
      <p style="color: #666; font-size: 0.9em; font-style: italic; margin: 0.5rem 0;">
        Positions are automatically randomized during build. No manual input needed.
      </p>
      <input type="hidden" id="node-x" value="50">
      <input type="hidden" id="node-y" value="50">
    </div>

    <div class="form-group">
      <label><input type="checkbox" id="visible-on-landing" ${node.visible_on_landing !== false ? 'checked' : ''}> Visible on landing page</label>
    </div>
  `;

  // Type-specific fields
  let typeSpecificFields = '';

  if (node.type === 'essay') {
    typeSpecificFields = `
      <div class="form-group">
        <label for="node-description">Description</label>
        <input type="text" id="node-description" value="${node.description || ''}">
      </div>

      <div class="form-group">
        <label for="node-subtype">Subtype</label>
        <input type="text" id="node-subtype" value="${node.subtype || 'essay'}">
      </div>

      <div class="form-group">
        <label for="essay-file">Essay File *</label>
        <input type="text" id="essay-file" required pattern="[a-z0-9-]+\\.md" value="${node.essayFile || ''}" ${editingId ? 'disabled' : ''}>
        <small>Must end in .md${editingId ? ' (cannot be changed)' : ''}</small>
      </div>

      <div class="form-group">
        <label for="essay-content">Essay Content (Markdown) *</label>
        <textarea id="essay-content" required>${essayContent}</textarea>
      </div>

      <div class="form-group">
        <label for="node-created">Created Date</label>
        <input type="date" id="node-created" value="${node.created || ''}">
      </div>
    `;
  } else if (node.type === 'bio') {
    typeSpecificFields = `
      <div class="form-group">
        <label for="bio-text">Bio Text *</label>
        <textarea id="bio-text" required rows="5">${node.bioText || ''}</textarea>
        <small>Brief bio description</small>
      </div>
    `;
  } else if (node.type === 'music') {
    typeSpecificFields = `
      <div class="form-group">
        <label for="node-subtype">Subtype</label>
        <select id="node-subtype">
          <option value="sketch" ${node.subtype === 'sketch' ? 'selected' : ''}>Sketch</option>
          <option value="mix" ${node.subtype === 'mix' ? 'selected' : ''}>Mix</option>
          <option value="composition" ${node.subtype === 'composition' ? 'selected' : ''}>Composition</option>
        </select>
      </div>

      <div class="form-group">
        <label for="node-description">Description</label>
        <input type="text" id="node-description" value="${node.description || ''}">
      </div>
    `;
  } else if (node.type === 'movement') {
    typeSpecificFields = `
      <div class="form-group">
        <label for="node-subtype">Subtype</label>
        <select id="node-subtype">
          <option value="piece" ${node.subtype === 'piece' ? 'selected' : ''}>Piece</option>
          <option value="study" ${node.subtype === 'study' ? 'selected' : ''}>Study</option>
          <option value="improvisation" ${node.subtype === 'improvisation' ? 'selected' : ''}>Improvisation</option>
        </select>
      </div>

      <div class="form-group">
        <label for="node-description">Description</label>
        <input type="text" id="node-description" value="${node.description || ''}">
      </div>
    `;
  } else if (node.type === 'curiosity') {
    typeSpecificFields = `
      <div class="form-group">
        <label for="node-subtype">Subtype</label>
        <select id="node-subtype">
          <option value="map" ${node.subtype === 'map' ? 'selected' : ''}>Map</option>
          <option value="thread" ${node.subtype === 'thread' ? 'selected' : ''}>Thread</option>
        </select>
      </div>

      <div class="form-group">
        <label for="node-description">Description</label>
        <input type="text" id="node-description" value="${node.description || ''}">
      </div>

      <div class="form-group">
        <label><input type="checkbox" id="is-hub" ${node.is_hub ? 'checked' : ''}> Is Hub (central topic)</label>
      </div>

      <div class="form-group">
        <label for="curiosity-central">Central Topic</label>
        <input type="text" id="curiosity-central" value="${node.id || ''}" placeholder="Central topic keyword">
        <small>The main topic this curiosity explores</small>
      </div>

      <div class="form-group">
        <label>Connected Nodes</label>
        <div id="curiosity-connections">
          <button type="button" class="btn btn-secondary" onclick="addCuriosityConnection()">+ Add Connection</button>
          <div id="connection-list"></div>
        </div>
        <small>Topics, people, or concepts connected to this curiosity</small>
      </div>
    `;
  } else if (node.type === 'durational') {
    typeSpecificFields = `
      <div class="form-group">
        <label for="node-subtype">Subtype</label>
        <select id="node-subtype">
          <option value="dj-mix" ${node.subtype === 'dj-mix' ? 'selected' : ''}>DJ Mix</option>
          <option value="piece" ${node.subtype === 'piece' ? 'selected' : ''}>Piece</option>
          <option value="performance" ${node.subtype === 'performance' ? 'selected' : ''}>Performance</option>
          <option value="talk" ${node.subtype === 'talk' ? 'selected' : ''}>Talk</option>
          <option value="presentation" ${node.subtype === 'presentation' ? 'selected' : ''}>Presentation</option>
          <option value="podcast" ${node.subtype === 'podcast' ? 'selected' : ''}>Podcast</option>
        </select>
      </div>

      <div class="form-group">
        <label for="node-description">Description *</label>
        <textarea id="node-description" rows="4" required>${node.description || ''}</textarea>
        <small>Main description shown below the embed</small>
      </div>

      <div class="form-group">
        <label for="media-source">Media Source</label>
        <select id="media-source">
          <option value="soundcloud" ${node.media?.source === 'soundcloud' ? 'selected' : ''}>SoundCloud</option>
          <option value="mixcloud" ${node.media?.source === 'mixcloud' ? 'selected' : ''}>Mixcloud</option>
          <option value="youtube" ${node.media?.source === 'youtube' ? 'selected' : ''}>YouTube</option>
          <option value="vimeo" ${node.media?.source === 'vimeo' ? 'selected' : ''}>Vimeo</option>
          <option value="spotify" ${node.media?.source === 'spotify' ? 'selected' : ''}>Spotify</option>
        </select>
      </div>

      <div class="form-group">
        <label for="media-url">Media URL *</label>
        <input type="url" id="media-url" required value="${node.media?.url || ''}" placeholder="https://...">
        <small>Full URL to the embed (e.g., SoundCloud track URL)</small>
      </div>

      <div class="form-group">
        <label for="media-duration">Duration</label>
        <input type="text" id="media-duration" value="${node.media?.duration || ''}" placeholder="62:00">
        <small>Optional duration in MM:SS format</small>
      </div>

      <div class="form-group">
        <label for="durational-commentary">Commentary</label>
        <textarea id="durational-commentary" rows="3">${node.commentary || ''}</textarea>
        <small>Optional additional commentary</small>
      </div>

      <div class="form-group">
        <label for="node-created">Created Date</label>
        <input type="date" id="node-created" value="${node.created || ''}">
      </div>
    `;
  }

  // Bottom buttons
  const bottomButtons = `
    <div class="form-actions-bottom">
      ${editingId ? '<button type="button" class="btn btn-danger btn-delete-bottom">Delete</button>' : ''}
      <div style="margin-left: auto; display: flex; gap: 0.75rem;">
        <button type="button" class="btn btn-secondary btn-cancel-bottom">Cancel</button>
        <button type="button" class="btn btn-primary btn-save-bottom">Save</button>
      </div>
    </div>
  `;

  editForm.innerHTML = commonFields + typeSpecificFields + threadsField + positionFields + bottomButtons;

  // Add event listeners to bottom buttons
  const btnCancelBottom = document.querySelector('.btn-cancel-bottom');
  const btnSaveBottom = document.querySelector('.btn-save-bottom');
  const btnDeleteBottom = document.querySelector('.btn-delete-bottom');

  if (btnCancelBottom) {
    btnCancelBottom.addEventListener('click', () => hideEditForm());
  }
  if (btnSaveBottom) {
    btnSaveBottom.addEventListener('click', () => handleSave());
  }
  if (btnDeleteBottom && editingId) {
    btnDeleteBottom.addEventListener('click', () => window.deleteNode(editingId));
  }

  // If curiosity type, load existing connections
  if (node.type === 'curiosity' && node.id) {
    await loadCuriosityConnections(node.id);
  }
}

// Load curiosity data and populate connections
async function loadCuriosityConnections(nodeId) {
  try {
    const response = await fetch(`http://localhost:3001/api/curiosity/${nodeId}`);
    if (!response.ok) {
      // Curiosity data file doesn't exist yet, that's fine for new curiosities
      console.log('No curiosity data file found for', nodeId);
      return;
    }
    const result = await response.json();
    const curiosityData = result.data;

    console.log('Loaded curiosity data:', curiosityData);

    // Wait for DOM to be ready
    await new Promise(resolve => setTimeout(resolve, 0));

    // Populate curiosity-specific fields
    const centralInput = document.getElementById('curiosity-central');

    if (centralInput && curiosityData.central) {
      centralInput.value = curiosityData.central;
    }

    // Note: The main title is already populated from the node data in showEditForm

    // Render existing connections
    if (curiosityData.connected && curiosityData.connected.length > 0) {
      console.log('Adding', curiosityData.connected.length, 'connections');
      curiosityData.connected.forEach(conn => {
        addCuriosityConnection(conn.label, conn.linksTo || '');
      });
    }
  } catch (error) {
    console.error('Failed to load curiosity data:', error);
  }
}

// Add a connection input row
window.addCuriosityConnection = function(label = '', linksTo = '') {
  const connectionList = document.getElementById('connection-list');
  const connectionIndex = connectionList.children.length;

  const connectionRow = document.createElement('div');
  connectionRow.className = 'connection-row';
  connectionRow.innerHTML = `
    <input type="text" placeholder="Label (e.g., 'Octavia Butler')" value="${label}" class="connection-label" data-index="${connectionIndex}">
    <input type="text" placeholder="URL (optional)" value="${linksTo}" class="connection-url" data-index="${connectionIndex}">
    <button type="button" class="btn btn-danger btn-sm" onclick="removeCuriosityConnection(this)">Remove</button>
  `;

  connectionList.appendChild(connectionRow);
};

// Remove a connection row
window.removeCuriosityConnection = function(button) {
  button.closest('.connection-row').remove();
};

// Global functions for inline onclick
window.editNode = async function(id) {
  try {
    const node = allNodes.find(n => n.id === id);
    if (!node) {
      showNotification('error', 'Node not found');
      return;
    }

    editingId = id;
    editTitle.textContent = `Edit ${node.type}: ${node.title}`;

    // Hide content list section when editing
    document.querySelector('.content-list-section').classList.add('hidden');
    editSection.classList.remove('hidden');

    // Update URL to reflect edit state
    updateURL(currentType, id);

    // Load essay content if needed
    let essayContent = '';
    if (node.type === 'essay' && node.essayFile) {
      try {
        const essayResult = await API.getEssay(node.essayFile);
        essayContent = essayResult.data || '';
      } catch (err) {
        console.error('Failed to load essay content:', err);
      }
    }

    // Load durational data if needed
    if (node.type === 'durational') {
      try {
        const durationalResult = await fetch(`http://localhost:3001/api/durational/${id}`);
        if (durationalResult.ok) {
          const result = await durationalResult.json();
          if (result.success && result.data) {
            // Merge durational data into node
            Object.assign(node, result.data);
          }
        }
      } catch (err) {
        console.error('Failed to load durational data:', err);
      }
    }

    // Generate edit form based on type
    await showEditForm(node, essayContent);
    editForm.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    showNotification('error', `Failed to load node: ${error.message}`);
  }
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

// Status Monitoring
function startStatusMonitoring() {
  // Check status immediately
  checkServerStatus();

  // Then check every 5 seconds
  statusCheckInterval = setInterval(checkServerStatus, 5000);
}

async function checkServerStatus() {
  try {
    const response = await fetch('http://localhost:3001/api/health');

    if (response.ok) {
      const health = await response.json();

      if (health.success && health.status === 'ready') {
        updateStatus('ready', 'Ready');
      } else {
        updateStatus('unknown', 'Unknown');
      }
    } else {
      updateStatus('error', 'Error');
    }
  } catch (error) {
    // Server is down or unreachable
    updateStatus('error', 'Server Down');
  }
}

function updateStatus(status, text) {
  const statusText = document.getElementById('status-text');

  if (!statusText) return;

  // Update text with emoji
  const statusEmojis = {
    ready: '🟢',
    building: '🟡',
    error: '🔴',
    deploying: '🔵',
    unknown: '⚪'
  };

  statusText.textContent = `${statusEmojis[status]} ${text}`;
}

// Expose updateStatus globally for potential external use
window.updateCMSStatus = updateStatus;

// Phrases Management
let allPhrases = [];

async function loadPhrases() {
  try {
    const response = await fetch('http://localhost:3001/api/phrases');
    const result = await response.json();

    if (result.success) {
      allPhrases = result.data || [];
      renderPhrasesList();
    } else {
      showNotification('error', 'Failed to load phrases');
      contentList.innerHTML = '<p class="empty-state">Failed to load phrases</p>';
    }
  } catch (error) {
    showNotification('error', `Failed to load phrases: ${error.message}`);
    contentList.innerHTML = '<p class="empty-state">Failed to load phrases</p>';
  }
}

function renderPhrasesList() {
  if (allPhrases.length === 0) {
    contentList.innerHTML = '<p class="empty-state">No phrases found. Create your first one!</p>';
    return;
  }

  contentList.innerHTML = allPhrases.map((phrase, index) => `
    <div class="content-card clickable" data-index="${index}" onclick="window.editPhrase(${index})">
      <div class="content-card-header">
        <h3>"${phrase.text}"</h3>
      </div>
      <div class="content-card-meta">
        ${phrase.by ? `— ${phrase.by}` : '— Anonymous'}
      </div>
    </div>
  `).join('');
}

window.editPhrase = function(index) {
  const phrase = allPhrases[index];

  editingId = index;
  editTitle.textContent = `Edit Phrase`;

  // Hide content list section when editing
  document.querySelector('.content-list-section').classList.add('hidden');
  editSection.classList.remove('hidden');

  // Build edit form for phrase
  editForm.innerHTML = `
    <div class="form-group">
      <label for="phrase-text">Text *</label>
      <textarea id="phrase-text" rows="4" required>${phrase.text || ''}</textarea>
      <small>The phrase or quote text</small>
    </div>

    <div class="form-group">
      <label for="phrase-by">Attribution</label>
      <input type="text" id="phrase-by" value="${phrase.by || ''}" placeholder="Author name (optional)">
      <small>Who said or wrote this phrase (leave empty for anonymous)</small>
    </div>

    <div class="form-actions-bottom">
      <button type="button" class="btn btn-danger btn-delete-bottom">Delete</button>
      <div style="margin-left: auto; display: flex; gap: 0.75rem;">
        <button type="button" class="btn btn-secondary btn-cancel-bottom">Cancel</button>
        <button type="button" class="btn btn-primary btn-save-bottom">Save</button>
      </div>
    </div>
  `;

  // Add event listeners
  document.querySelector('.btn-cancel-bottom').addEventListener('click', () => hideEditForm());
  document.querySelector('.btn-save-bottom').addEventListener('click', () => savePhrase());
  document.querySelector('.btn-delete-bottom').addEventListener('click', () => window.deletePhrase(index));

  editForm.scrollIntoView({ behavior: 'smooth' });
};

async function savePhrase() {
  try {
    const text = document.getElementById('phrase-text').value;
    const by = document.getElementById('phrase-by').value;

    if (!text) {
      showNotification('error', 'Phrase text is required');
      return;
    }

    const updatedPhrase = { text, by };

    // Update the phrase in the array
    allPhrases[editingId] = updatedPhrase;

    // Send updated phrases to server
    const response = await fetch('http://localhost:3001/api/phrases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phrases: allPhrases })
    });

    const result = await response.json();

    if (result.success) {
      showNotification('success', 'Phrase updated successfully');
      await loadPhrases();
      hideEditForm();
    } else {
      showNotification('error', result.error || 'Failed to update phrase');
    }
  } catch (error) {
    showNotification('error', `Save failed: ${error.message}`);
  }
}

window.deletePhrase = async function(index) {
  if (!confirm('Are you sure you want to delete this phrase? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/phrases/${index}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showNotification('success', 'Phrase deleted successfully');
      await loadPhrases();
    } else {
      showNotification('error', result.error || 'Failed to delete phrase');
    }
  } catch (error) {
    showNotification('error', `Delete failed: ${error.message}`);
  }
};

// Connections Management
let allConnections = [];

async function loadConnections() {
  try {
    const response = await fetch('http://localhost:3001/api/connections');
    const result = await response.json();

    if (result.success) {
      allConnections = result.data || [];
      renderConnectionsList();
    } else {
      showNotification('error', 'Failed to load connections');
      contentList.innerHTML = '<p class="empty-state">Failed to load connections</p>';
    }
  } catch (error) {
    showNotification('error', `Failed to load connections: ${error.message}`);
    contentList.innerHTML = '<p class="empty-state">Failed to load connections</p>';
  }
}

function renderConnectionsList() {
  if (allConnections.length === 0) {
    contentList.innerHTML = '<p class="empty-state">No connections found. Create your first one!</p>';
    return;
  }

  contentList.innerHTML = allConnections.map((conn, index) => `
    <div class="content-card clickable" data-index="${index}" onclick="window.editConnection(${index})">
      <div class="content-card-header">
        <h3>${conn.from} → ${conn.to}</h3>
        <span class="type-badge">${conn.threads.join(', ')}</span>
      </div>
    </div>
  `).join('');
}

window.editConnection = function(index) {
  const conn = allConnections[index];

  editingId = index;
  editTitle.textContent = `Edit Connection`;

  // Hide content list section when editing
  document.querySelector('.content-list-section').classList.add('hidden');
  editSection.classList.remove('hidden');

  // Build edit form for connection
  editForm.innerHTML = `
    <div class="form-group">
      <label for="conn-from">From Node ID *</label>
      <input type="text" id="conn-from" required value="${conn.from || ''}" placeholder="e.g., beat-sketch">
      <small>The ID of the source node</small>
    </div>

    <div class="form-group">
      <label for="conn-to">To Node ID *</label>
      <input type="text" id="conn-to" required value="${conn.to || ''}" placeholder="e.g., mix-2019">
      <small>The ID of the target node</small>
    </div>

    <div class="form-group">
      <label>Threads *</label>
      <div class="checkbox-group">
        <label><input type="checkbox" name="conn-threads" value="music" ${conn.threads?.includes('music') ? 'checked' : ''}> Music</label>
        <label><input type="checkbox" name="conn-threads" value="movement" ${conn.threads?.includes('movement') ? 'checked' : ''}> Movement</label>
        <label><input type="checkbox" name="conn-threads" value="questions" ${conn.threads?.includes('questions') ? 'checked' : ''}> Questions</label>
      </div>
    </div>

    <div class="form-actions-bottom">
      <button type="button" class="btn btn-danger btn-delete-bottom">Delete</button>
      <div style="margin-left: auto; display: flex; gap: 0.75rem;">
        <button type="button" class="btn btn-secondary btn-cancel-bottom">Cancel</button>
        <button type="button" class="btn btn-primary btn-save-bottom">Save</button>
      </div>
    </div>
  `;

  // Add event listeners
  document.querySelector('.btn-cancel-bottom').addEventListener('click', () => hideEditForm());
  document.querySelector('.btn-save-bottom').addEventListener('click', () => saveConnection());
  document.querySelector('.btn-delete-bottom').addEventListener('click', () => window.deleteConnection(index));

  editForm.scrollIntoView({ behavior: 'smooth' });
};

async function saveConnection() {
  try {
    const from = document.getElementById('conn-from').value;
    const to = document.getElementById('conn-to').value;
    const threads = Array.from(document.querySelectorAll('input[name="conn-threads"]:checked'))
      .map(cb => cb.value);

    if (!from || !to) {
      showNotification('error', 'Both from and to node IDs are required');
      return;
    }

    if (threads.length === 0) {
      showNotification('error', 'At least one thread must be selected');
      return;
    }

    const updatedConnection = { from, to, threads };

    // Update the connection in the array
    allConnections[editingId] = updatedConnection;

    // Send updated connections to server
    const response = await fetch('http://localhost:3001/api/connections', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ connections: allConnections })
    });

    const result = await response.json();

    if (result.success) {
      showNotification('success', 'Connection updated successfully');
      await loadConnections();
      hideEditForm();
    } else {
      showNotification('error', result.error || 'Failed to update connection');
    }
  } catch (error) {
    showNotification('error', `Save failed: ${error.message}`);
  }
}

window.deleteConnection = async function(index) {
  if (!confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
    return;
  }

  try {
    const response = await fetch(`http://localhost:3001/api/connections/${index}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      showNotification('success', 'Connection deleted successfully');
      await loadConnections();
    } else {
      showNotification('error', result.error || 'Failed to delete connection');
    }
  } catch (error) {
    showNotification('error', `Delete failed: ${error.message}`);
  }
};

// Theme Management
function initTheme() {
  // Prevent transitions on initial load
  document.documentElement.classList.add('no-transitions');

  // Check for saved theme preference or default to system preference
  const savedTheme = localStorage.getItem('cms-theme');

  if (savedTheme) {
    currentTheme = savedTheme;
  } else {
    // Check system preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    currentTheme = prefersDark ? 'dark' : 'light';
  }

  // Apply theme immediately
  applyTheme(currentTheme);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only auto-switch if user hasn't manually set a preference
    if (!localStorage.getItem('cms-theme')) {
      currentTheme = e.matches ? 'dark' : 'light';
      applyTheme(currentTheme);
    }
  });
}

function toggleTheme() {
  currentTheme = currentTheme === 'light' ? 'dark' : 'light';
  applyTheme(currentTheme);
  localStorage.setItem('cms-theme', currentTheme);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Update theme toggle icon
  const themeIcon = document.querySelector('.theme-icon');
  if (themeIcon) {
    themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

// Expose theme functions globally
window.setTheme = function(theme) {
  if (theme === 'light' || theme === 'dark') {
    currentTheme = theme;
    applyTheme(theme);
    localStorage.setItem('cms-theme', theme);
  }
};
