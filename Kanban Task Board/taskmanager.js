let tasks = [];
let editingId = null;

const counter = document.getElementById('task-counter');
const modal = document.getElementById('modal-overlay');

function createTaskCard(taskObj) {
    const li = document.createElement('li');
    li.setAttribute('data-id', taskObj.id);
    li.setAttribute('data-priority', taskObj.priority);
    li.classList.add('task-card', `priority-${taskObj.priority}`);

    const title = document.createElement('h4');
    title.textContent = taskObj.title;
    title.classList.add('editable-title');

    const desc = document.createElement('p');
    desc.textContent = taskObj.description;

    const date = document.createElement('small');
    date.textContent = `Due: ${taskObj.date}`;

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('data-id', taskObj.id);

    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.setAttribute('data-action', 'delete');
    delBtn.setAttribute('data-id', taskObj.id);

    li.appendChild(title);
    li.appendChild(desc);
    li.appendChild(date);
    li.appendChild(editBtn);
    li.appendChild(delBtn);

    return li;
}

function updateCounter() {
    counter.textContent = tasks.length;
}

function addTask(columnId, taskObj) {
    tasks.push(taskObj);
    const list = document.querySelector(`#${columnId} .task-list`);
    list.appendChild(createTaskCard(taskObj));
    updateCounter();
}

// Open Modal
document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        editingId = null;
        document.getElementById('modal-title-text').textContent = 'Add New Task';
        modal.classList.remove('is-hidden');
        modal.setAttribute('data-target-col', btn.getAttribute('data-column'));
    });
});

// Save Task (Combined Create/Update)
document.getElementById('save-task').addEventListener('click', () => {
    const taskData = {
        id: editingId || Date.now(),
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: document.getElementById('task-priority').value,
        date: document.getElementById('task-date').value
    };

    if (editingId) {
        updateTask(editingId, taskData);
    } else {
        const colId = modal.getAttribute('data-target-col');
        addTask(colId, taskData);
    }
    closeModal();
});

function deleteTask(taskId) {
    const card = document.querySelector(`[data-id="${taskId}"]`);
    card.classList.add('fade-out');
    setTimeout(() => {
        card.remove();
        tasks = tasks.filter(t => t.id !== taskId);
        updateCounter();
    }, 300);
}

// Event Delegation for Edit/Delete
document.querySelectorAll('.task-list').forEach(list => {
    list.addEventListener('click', (e) => {
        const action = e.target.getAttribute('data-action');
        const id = parseInt(e.target.getAttribute('data-id'));
        if (action === 'delete') deleteTask(id);
        if (action === 'edit') prepareEdit(id);
    });
});

function closeModal() {
    modal.classList.add('is-hidden');
    document.querySelectorAll('.modal input, .modal textarea').forEach(i => i.value = '');
}
document.getElementById('cancel-task').addEventListener('click', closeModal);

// Priority Filtering
document.getElementById('filter-priority').addEventListener('change', (e) => {
    const val = e.target.value;
    document.querySelectorAll('.task-card').forEach(card => {
        const match = val === 'all' || card.getAttribute('data-priority') === val;
        card.classList.toggle('is-hidden', !match);
    });
});

// Clear Done with Staggered Animation
document.getElementById('clear-done').addEventListener('click', () => {
    const doneCards = document.querySelectorAll('#done .task-card');
    doneCards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('fade-out');
            setTimeout(() => {
                const id = parseInt(card.getAttribute('data-id'));
                tasks = tasks.filter(t => t.id !== id);
                card.remove();
                updateCounter();
            }, 300);
        }, index * 100);
    });
});

// Inline Edit (Example for titles)
document.addEventListener('dblclick', (e) => {
    if (e.target.classList.contains('editable-title')) {
        const oldText = e.target.textContent;
        const input = document.createElement('input');
        input.value = oldText;
        
        const save = () => {
            e.target.textContent = input.value;
            input.replaceWith(e.target);
        };

        input.addEventListener('blur', save);
        input.addEventListener('keydown', (key) => { if(key.key === 'Enter') save(); });
        
        e.target.replaceWith(input);
        input.focus();
    }
});