/* ──────────────────────────────────────────────────────────
   taskmanager.js  —  Kanban Task Board Logic
   No frameworks · No localStorage · Pure DOM API
────────────────────────────────────────────────────────── */

// ── State ──────────────────────────────────────────────────
let tasks     = [];   // master task array
let editingId = null; // id of task currently being edited (null = new task)

// ── DOM References ─────────────────────────────────────────
const modal          = document.getElementById('modal-overlay');
const titleInput     = document.getElementById('task-title');
const descInput      = document.getElementById('task-desc');
const priorityInput  = document.getElementById('task-priority');
const dateInput      = document.getElementById('task-date');
const modalTitleText = document.getElementById('modal-title-text');
const counterBadge   = document.getElementById('task-counter');

// Column task-list elements keyed by columnId
const lists = {
  todo:       document.getElementById('list-todo'),
  inprogress: document.getElementById('list-inprogress'),
  done:       document.getElementById('list-done'),
};

// Column count badges
const colCounts = {
  todo:       document.getElementById('count-todo'),
  inprogress: document.getElementById('count-inprogress'),
  done:       document.getElementById('count-done'),
};

/* ─────────────────────────────────────────────────────────
   TASK 2 — Core CRUD Functions
───────────────────────────────────────────────────────── */

/**
 * createTaskCard(taskObj)
 * Builds a <li> element for the given task using only the
 * DOM API — no innerHTML, no template literals.
 * Returns the completed <li> element (does not append it).
 */
function createTaskCard(taskObj) {
  // Wrapper
  const li = document.createElement('li');
  li.setAttribute('data-id', taskObj.id);
  li.setAttribute('data-priority', taskObj.priority);
  li.classList.add('task-card');

  // ── Top row: title + priority badge ──
  const cardTop = document.createElement('div');
  cardTop.classList.add('card-top');

  const titleEl = document.createElement('span');
  titleEl.classList.add('task-title', 'editable-title');
  titleEl.textContent = taskObj.title;

  const badge = document.createElement('span');
  badge.classList.add('priority-badge', `badge-${taskObj.priority}`);
  badge.textContent = taskObj.priority;

  cardTop.appendChild(titleEl);
  cardTop.appendChild(badge);

  // ── Description ──
  const descEl = document.createElement('p');
  descEl.classList.add('task-desc');
  descEl.textContent = taskObj.description;

  // ── Meta row: due date + action buttons ──
  const metaRow = document.createElement('div');
  metaRow.classList.add('card-meta');

  const dateEl = document.createElement('span');
  dateEl.classList.add('task-date');
  // Format the date nicely if present
  if (taskObj.date) {
    const d = new Date(taskObj.date + 'T00:00:00');
    dateEl.textContent = 'Due ' + d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } else {
    dateEl.textContent = 'No due date';
  }

  const actionsEl = document.createElement('div');
  actionsEl.classList.add('card-actions');

  const editBtn = document.createElement('button');
  editBtn.classList.add('card-btn', 'card-btn-edit');
  editBtn.setAttribute('data-action', 'edit');
  editBtn.setAttribute('data-id', taskObj.id);
  editBtn.textContent = 'Edit';

  const moveBtn = document.createElement('button');
  moveBtn.classList.add('card-btn', 'card-btn-move');
  moveBtn.setAttribute('data-action', 'move');
  moveBtn.setAttribute('data-id', taskObj.id);
  moveBtn.textContent = 'Move →';

  const delBtn = document.createElement('button');
  delBtn.classList.add('card-btn', 'card-btn-delete');
  delBtn.setAttribute('data-action', 'delete');
  delBtn.setAttribute('data-id', taskObj.id);
  delBtn.textContent = 'Delete';

  actionsEl.appendChild(editBtn);
  actionsEl.appendChild(moveBtn);
  actionsEl.appendChild(delBtn);

  metaRow.appendChild(dateEl);
  metaRow.appendChild(actionsEl);

  // ── Assemble card ──
  li.appendChild(cardTop);
  if (taskObj.description) li.appendChild(descEl);
  li.appendChild(metaRow);

  return li;
}

/**
 * addTask(columnId, taskObj)
 * Pushes taskObj onto the tasks array, appends its card to
 * the correct column list, and refreshes all counters.
 */
function addTask(columnId, taskObj) {
  taskObj.column = columnId;
  tasks.push(taskObj);
  const list = lists[columnId];
  if (!list) return;
  const card = createTaskCard(taskObj);
  list.appendChild(card);
  updateCounters();
}

/**
 * deleteTask(taskId)
 * Adds a fade-out class, waits for the CSS transition to
 * finish (300 ms), then removes the element and updates state.
 */
function deleteTask(taskId) {
  const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
  if (!card) return;

  card.classList.add('fade-out');

  setTimeout(() => {
    card.remove();
    tasks = tasks.filter(t => t.id !== taskId);
    updateCounters();
  }, 300);
}

/**
 * editTask(taskId)
 * Looks up the task by id, pre-fills the modal form with its
 * existing data, and opens the modal in "edit" mode.
 */
function editTask(taskId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  editingId = taskId;
  modalTitleText.textContent = 'Edit task';
  titleInput.value    = task.title;
  descInput.value     = task.description;
  priorityInput.value = task.priority;
  dateInput.value     = task.date;

  openModal();
}

/**
 * updateTask(taskId, updatedData)
 * Merges updatedData into the matching task object, then
 * replaces the old DOM card with a freshly built one.
 */
function updateTask(taskId, updatedData) {
  const index = tasks.findIndex(t => t.id === taskId);
  if (index === -1) return;

  // Merge updated fields into the existing task
  tasks[index] = Object.assign(tasks[index], updatedData);

  // Find the old card and replace it in-place
  const oldCard = document.querySelector(`.task-card[data-id="${taskId}"]`);
  if (!oldCard) return;

  const newCard = createTaskCard(tasks[index]);
  oldCard.replaceWith(newCard);

  updateCounters();
}

/* ─────────────────────────────────────────────────────────
   TASK 3 — Event Handling
───────────────────────────────────────────────────────── */

// ── Event Delegation: single listener per column <ul> ──────
// Handles Edit and Delete via data-action / data-id attributes
Object.values(lists).forEach(list => {
  list.addEventListener('click', function (e) {
    const action = e.target.getAttribute('data-action');
    const idStr  = e.target.getAttribute('data-id');
    if (!action || !idStr) return; // click landed elsewhere

    const taskId = Number(idStr);

    if (action === 'delete') deleteTask(taskId);
    if (action === 'edit')   editTask(taskId);
    if (action === 'move')   openMovePopover(taskId, e.target);
  });
});

// ── Add Task buttons (one per column) ──────────────────────
document.querySelectorAll('.add-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    editingId = null;
    modalTitleText.textContent = 'Add new task';
    clearModalFields();
    // Remember which column this task belongs to
    modal.setAttribute('data-target-col', btn.getAttribute('data-column'));
    openModal();
  });
});

// ── Modal Save ─────────────────────────────────────────────
document.getElementById('save-task').addEventListener('click', () => {
  const title = titleInput.value.trim();
  if (!title) {
    titleInput.focus();
    titleInput.style.borderColor = 'var(--prio-high)';
    return;
  }
  titleInput.style.borderColor = '';

  const taskData = {
    id:          editingId || Date.now(),
    title:       title,
    description: descInput.value.trim(),
    priority:    priorityInput.value,
    date:        dateInput.value,
  };

  if (editingId) {
    updateTask(editingId, taskData);
  } else {
    const colId = modal.getAttribute('data-target-col') || 'todo';
    addTask(colId, taskData);
  }

  closeModal();
});

// ── Modal Cancel & Close X ─────────────────────────────────
document.getElementById('cancel-task').addEventListener('click', closeModal);
document.getElementById('modal-close-x').addEventListener('click', closeModal);

// Close modal on overlay click (outside the modal box)
modal.addEventListener('click', function (e) {
  if (e.target === modal) closeModal();
});

// Close modal on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape' && !modal.classList.contains('is-hidden')) closeModal();
});

// ── Priority Filter ─────────────────────────────────────────
// Hides non-matching cards using classList.toggle (not style.display)
document.getElementById('filter-priority').addEventListener('change', function (e) {
  const val = e.target.value;

  document.querySelectorAll('.task-card').forEach(card => {
    const match = val === 'all' || card.getAttribute('data-priority') === val;
    card.classList.toggle('is-hidden', !match);
  });
});

// ── Clear Done: staggered fade-out (100 ms delay each) ─────
document.getElementById('clear-done').addEventListener('click', () => {
  const doneCards = document.querySelectorAll('#list-done .task-card');

  doneCards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add('fade-out');
      setTimeout(() => {
        const id = Number(card.getAttribute('data-id'));
        tasks = tasks.filter(t => t.id !== id);
        card.remove();
        updateCounters();
      }, 300); // wait for CSS transition
    }, index * 100); // stagger each card by 100 ms
  });
});

// ── Inline Title Editing ────────────────────────────────────
// Double-click a .editable-title → swap for <input>, commit on Enter/blur
document.addEventListener('dblclick', function (e) {
  if (!e.target.classList.contains('editable-title')) return;

  const titleSpan = e.target;
  const oldText   = titleSpan.textContent;

  // Build the inline input
  const input = document.createElement('input');
  input.classList.add('inline-edit-input');
  input.value = oldText;

  // Commit: update both DOM and tasks array
  function commitEdit() {
    const newText = input.value.trim() || oldText; // fall back if empty
    titleSpan.textContent = newText;
    input.replaceWith(titleSpan);

    // Sync to tasks array
    const card   = titleSpan.closest('.task-card');
    const taskId = Number(card.getAttribute('data-id'));
    const task   = tasks.find(t => t.id === taskId);
    if (task) task.title = newText;
  }

  input.addEventListener('blur',    commitEdit);
  input.addEventListener('keydown', function (ke) {
    if (ke.key === 'Enter')  { ke.preventDefault(); input.blur(); }
    if (ke.key === 'Escape') { input.value = oldText; input.blur(); }
  });

  titleSpan.replaceWith(input);
  input.focus();
  input.select();
});

/* ─────────────────────────────────────────────────────────
   MOVE FEATURE
───────────────────────────────────────────────────────── */

// Human-readable labels for each column id
const COLUMN_LABELS = {
  todo:       'To Do',
  inprogress: 'In Progress',
  done:       'Done',
};

/**
 * moveTask(taskId, targetColId)
 */
function moveTask(taskId, targetColId) {
  const task = tasks.find(t => t.id === taskId);
  if (!task || task.column === targetColId) return;

  const card = document.querySelector(`.task-card[data-id="${taskId}"]`);
  const targetList = lists[targetColId];

  if (!card || !targetList) return;

  // update task state first
  task.column = targetColId;

  // visual effect
  card.classList.add('card-moving');

  setTimeout(() => {
    targetList.appendChild(card);

    card.classList.remove('card-moving');
    card.classList.add('card-moved');

    setTimeout(() => {
      card.classList.remove('card-moved');
    }, 600);

    updateCounters();
  }, 150);
}
/**
 * openMovePopover(taskId, anchorBtn)
 * Builds a small popover (using createElement) anchored below
 * the Move button, listing the other two columns as options.
 * Closes on option click, outside click, or Escape.
 */
function openMovePopover(taskId, anchorBtn) {
  closeMovePopover();

  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const currentColId = task.column;

  const popover = document.createElement('div');
  popover.classList.add('move-popover');
  popover.id = 'active-move-popover';

  Object.keys(COLUMN_LABELS).forEach(colId => {
    if (colId === currentColId) return;

    const option = document.createElement('button');
    option.type = 'button';
    option.classList.add('move-option');

    const dot = document.createElement('span');
    dot.classList.add('move-option-dot', `dot-${colId}`);

    const label = document.createElement('span');
    label.textContent = COLUMN_LABELS[colId];

    option.appendChild(dot);
    option.appendChild(label);

    option.addEventListener('click', function (e) {
      e.stopPropagation();

      moveTask(taskId, colId);
      closeMovePopover();
    });

    popover.appendChild(option);
  });

  anchorBtn.classList.add('move-btn-active');

  // attach next to the button each time
  anchorBtn.parentNode.appendChild(popover);

  // prevent clicks inside popover from closing it immediately
  popover.addEventListener('click', e => e.stopPropagation());

  // close on outside click
  setTimeout(() => {
    document.addEventListener('click', closeMovePopover, { once: true });
  }, 0);
}

/** Remove the active move popover and clean up the active button state */
function closeMovePopover() {
  const existing = document.getElementById('active-move-popover');
  if (existing) existing.remove();
  document.querySelectorAll('.move-btn-active').forEach(b => b.classList.remove('move-btn-active'));
}

// Close popover on Escape
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeMovePopover();
});

/* ─────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────── */

/** Open the modal overlay */
function openModal() {
  modal.classList.remove('is-hidden');
  // Focus the title input for accessibility
  setTimeout(() => titleInput.focus(), 50);
}

/** Close and reset the modal */
function closeModal() {
  modal.classList.add('is-hidden');
  clearModalFields();
  editingId = null;
  titleInput.style.borderColor = '';
}

/** Clear all modal form fields */
function clearModalFields() {
  titleInput.value    = '';
  descInput.value     = '';
  priorityInput.value = 'low';
  dateInput.value     = '';
}

/**
 * updateCounters()
 * Re-counts tasks per column and updates the header badge
 * and each column's count chip.
 */
function updateCounters() {
  // Total
  counterBadge.textContent = tasks.length === 1
    ? '1 task'
    : `${tasks.length} tasks`;

  // Per-column: count visible cards (not counting .is-hidden)
  Object.keys(lists).forEach(colId => {
    const cards = lists[colId].querySelectorAll('.task-card');
    colCounts[colId].textContent = cards.length;
  });
}