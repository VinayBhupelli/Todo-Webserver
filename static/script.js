let todos = [];

async function fetchTodos() {
  const res = await fetch('/todos');
  todos = await res.json();
  renderTodos();
}

function renderTodos() {
  document.querySelectorAll('.dropzone').forEach(zone => (zone.innerHTML = ''));
  const sortBy = document.getElementById('sort-select').value;
  let sortedTodos = [...todos];

  const notDone = sortedTodos.filter(t => !t.done);
  const done = sortedTodos.filter(t => t.done);

  if (sortBy === 'deadline') {
    notDone.sort((a, b) => (a.deadline || '').localeCompare(b.deadline || ''));
  } else if (sortBy === 'alphabetical') {
    notDone.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'newToOld') {
    notDone.sort((a, b) => b.createdAt - a.createdAt);
  } else if (sortBy === 'oldToNew') {
    notDone.sort((a, b) => a.createdAt - b.createdAt);
  }
  
  notDone.forEach(todo => {
    addTodoToColumn(todo, todo.due);
  });
  done.forEach(todo => {
    addTodoToColumn(todo, 'completed');
  });
}

function addTodoToColumn(todo, category) {
  const zone = document.getElementById(category + '-dropzone');
  if (!zone) return;

  const item = document.createElement('div');
  item.className = 'todo-item';
  item.draggable = true;
  item.dataset.id = todo.id;
  item.dataset.category = category;

  item.innerHTML = `
    <input type="checkbox" class="done-checkbox" ${todo.done ? 'checked' : ''} onchange="toggleDone(event, ${todo.id})">
    <span class="title" ondblclick="startEdit(${todo.id})">${todo.title}</span>
    <span class="deadline">${todo.deadline ? 'Deadline: ' + todo.deadline : ''}</span>
    <button onclick="startEdit(${todo.id})">Edit</button>
    <button onclick="deleteTodo(${todo.id})">Delete</button>
  `;
  item.addEventListener('dragstart', handleDragStart);
  item.addEventListener('dragend', handleDragEnd);
  zone.appendChild(item);
}
document.getElementById('todo-form').addEventListener('submit', async function (e) {
  e.preventDefault();
  const title = document.getElementById('todo-title').value.trim();
  const due = document.getElementById('todo-due').value;
  const deadline = document.getElementById('todo-deadline').value;
  if (title === '') return;
  const res = await fetch('/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, due, deadline, done: false }),
  });
  const newTodo = await res.json();
  todos.push(newTodo);
  document.getElementById('todo-title').value = '';
  document.getElementById('todo-deadline').value = '';
  fetchTodos();
});

async function deleteTodo(id) {
  await fetch('/todos?id=' + id, { method: 'DELETE' });
  todos = todos.filter(t => t.id !== id);
  fetchTodos();
}

const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editTitle = document.getElementById('edit-title');
const editDue = document.getElementById('edit-due');
const editDeadline = document.getElementById('edit-deadline');
const closeModal = document.querySelector('.close');

let currentTodoId = null;

function openEditModal(todo) {
  currentTodoId = todo.id;
  editTitle.value = todo.title;
  editDue.value = todo.due;
  editDeadline.value = todo.deadline || '';
  editModal.style.display = 'flex';
}

closeModal.addEventListener('click', () => {
  editModal.style.display = 'none';
});

editForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const updatedTodo = {
    id: currentTodoId,
    title: editTitle.value,
    due: editDue.value,
    deadline: editDeadline.value,
  };
  await fetch('/todos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedTodo),
  });
  editModal.style.display = 'none';
  fetchTodos();
});

async function startEdit(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  openEditModal(todo);
}

async function toggleDone(e, id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  todo.done = e.target.checked;
  await fetch('/todos', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(todo),
  });
  fetchTodos();
}

let draggedItem = null;
function handleDragStart(e) {
  draggedItem = this;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.id);
  this.classList.add('dragging');
}
function handleDragEnd(e) {
  this.classList.remove('dragging');
  draggedItem = null;
}
document.querySelectorAll('.dropzone').forEach(zone => {
  zone.addEventListener('dragover', function (e) {
    e.preventDefault();
    this.classList.add('over');
  });
  zone.addEventListener('dragleave', function (e) {
    this.classList.remove('over');
  });
  zone.addEventListener('drop', async function (e) {
    e.preventDefault();
    this.classList.remove('over');
    const id = parseInt(e.dataTransfer.getData('text/plain'));
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    const newCategory = this.parentElement.dataset.category;
    if (newCategory !== 'completed') {
      todo.due = newCategory;
      todo.done = false;
    }
    await fetch('/todos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo),
    });
    fetchTodos();
  });
});

document.getElementById('sort-select').addEventListener('change', function () {
  renderTodos();
});

fetchTodos();