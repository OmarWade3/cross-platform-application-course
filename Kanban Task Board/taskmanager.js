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