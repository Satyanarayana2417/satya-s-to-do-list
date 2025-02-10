document.addEventListener('DOMContentLoaded', function() {
    // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    const firebaseConfig = {
        apiKey: "AIzaSyAJknHv_ckH7OSKTIZuJbxh3MmiijWqIXM",
        authDomain: "satya-to-do.firebaseapp.com",
        projectId: "satya-to-do",
        storageBucket: "satya-to-do.firebasestorage.app",
        messagingSenderId: "223490863305",
        appId: "1:223490863305:web:4e32d1114022c41778dd18",
        measurementId: "G-PZHWGH4CC9"
    };

    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // DOM Elements
    const authPages = document.getElementById('authPages');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const showSignupLink = document.getElementById('showSignup');
    const showLoginLink = document.getElementById('showLogin');
    const logoutBtn = document.getElementById('logoutBtn');
    const container = document.querySelector('.container');
    const taskForm = document.getElementById('taskForm');
    const taskModal = document.getElementById('taskModal');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const tasksContainer = document.querySelector('.tasks-container');
    const searchInput = document.getElementById('searchTask');
    const menuItems = document.querySelectorAll('.menu li');
    const clearAllBtn = document.getElementById('clearAllBtn');
    const navToggle = document.querySelector('.nav-toggle');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.overlay');

    let currentSection = 'today';
    let editingTaskId = null;

    // Event Listeners
    addTaskBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'Add New Task';
        taskForm.reset();
        editingTaskId = null;
        taskModal.style.display = 'block';
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            taskModal.style.display = 'none';
        }
    });

    // Task Form Submit
    taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const taskData = {
            title: document.getElementById('taskTitle').value,
            description: document.getElementById('taskDescription').value,
            dueDate: new Date(document.getElementById('taskDate').value).toISOString(),
            category: document.getElementById('taskCategory').value,
            important: document.getElementById('taskImportant').checked,
            completed: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        try {
            if (editingTaskId) {
                await db.collection('tasks').doc(editingTaskId).update(taskData);
            } else {
                await db.collection('tasks').add(taskData);
            }
            taskModal.style.display = 'none';
            taskForm.reset();
            loadTasks();
        } catch (error) {
            console.error('Error saving task:', error);
            alert('Error saving task. Please try again.');
        }
    });

    // Menu Section Selection
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            currentSection = item.getAttribute('data-section');
            loadTasks();
        });
    });

    // Load Tasks Based on Section
    async function loadTasks() {
        tasksContainer.innerHTML = '<div class="loading">Loading tasks...</div>';

        try {
            let query = db.collection('tasks');

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Filter tasks based on current section
            switch (currentSection) {
                case 'today':
                    query = query.where('dueDate', '>=', today.toISOString())
                               .where('dueDate', '<', tomorrow.toISOString());
                    break;
                case 'upcoming':
                    query = query.where('dueDate', '>=', tomorrow.toISOString());
                    break;
                case 'personal':
                    query = query.where('category', '==', 'personal');
                    break;
                case 'professional':
                    query = query.where('category', '==', 'professional');
                    break;
                case 'completed':
                    query = query.where('completed', '==', true);
                    break;
                case 'scheduled':
                    query = query.orderBy('dueDate', 'asc')
                               .where('dueDate', '>=', today.toISOString());
                    break;
            }

            const snapshot = await query.get();

            if (snapshot.empty) {
                tasksContainer.innerHTML = '<div class="no-tasks">No tasks found</div>';
                return;
            }

            tasksContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const task = { id: doc.id, ...doc.data() };
                renderTask(task);
            });

        } catch (error) {
            console.error('Error loading tasks:', error);
            tasksContainer.innerHTML = '<div class="error">Error loading tasks. Please try again.</div>';
        }
    }

    // Render Individual Task
    function renderTask(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.important ? 'important' : ''} ${task.completed ? 'completed' : ''}`;
        taskElement.setAttribute('data-id', task.id);

        const dueDate = new Date(task.dueDate);

        taskElement.innerHTML = `
            <div class="task-content">
                <h3 class="task-title">${task.title}</h3>
                <p class="task-description">${task.description}</p>
                <div class="task-meta">
                    <span class="task-date">
                        <i class="fas fa-clock"></i> ${dueDate.toLocaleString()}
                    </span>
                    <span class="task-category">
                        <i class="fas ${task.category === 'personal' ? 'fa-user' : 'fa-briefcase'}"></i>
                        ${task.category}
                    </span>
                </div>
            </div>
            <div class="task-actions">
                <button onclick="toggleComplete('${task.id}')" class="complete-btn">
                    <i class="fas ${task.completed ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                </button>
                <button onclick="editTask('${task.id}')" class="edit-btn">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteTask('${task.id}')" class="delete-btn">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;

        // Add swipe functionality
        let touchStartX = 0;
        let touchEndX = 0;

        taskElement.addEventListener('touchstart', e => {
            touchStartX = e.touches[0].clientX;
        });

        taskElement.addEventListener('touchmove', e => {
            touchEndX = e.touches[0].clientX;
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 5) {
                taskElement.style.transform = `translateX(${-diff}px)`;
            }
        });

        taskElement.addEventListener('touchend', e => {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 100) {
                deleteTask(task.id);
            } else {
                taskElement.style.transform = '';
            }
        });

        tasksContainer.appendChild(taskElement);
    }

    // Toggle Task Completion
    async function toggleComplete(taskId) {
        try {
            const taskRef = db.collection('tasks').doc(taskId);
            const doc = await taskRef.get();
            const newStatus = !doc.data().completed;
            
            await taskRef.update({
                completed: newStatus
            });
            
            loadTasks();
        } catch (error) {
            console.error('Error toggling task:', error);
            alert('Error updating task. Please try again.');
        }
    }

    // Edit Task
    async function editTask(taskId) {
        try {
            const doc = await db.collection('tasks').doc(taskId).get();
            const task = doc.data();
            
            document.getElementById('modalTitle').textContent = 'Edit Task';
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description;
            document.getElementById('taskDate').value = new Date(task.dueDate).toISOString().slice(0, 16);
            document.getElementById('taskCategory').value = task.category;
            document.getElementById('taskImportant').checked = task.important;
            
            editingTaskId = taskId;
            taskModal.style.display = 'block';
        } catch (error) {
            console.error('Error editing task:', error);
            alert('Error loading task. Please try again.');
        }
    }

    // Delete Task
    async function deleteTask(taskId) {
        if (confirm('Are you sure you want to delete this task?')) {
            try {
                await db.collection('tasks').doc(taskId).delete();
                loadTasks();
            } catch (error) {
                console.error('Error deleting task:', error);
                alert('Error deleting task. Please try again.');
            }
        }
    }

    // Clear All Tasks
    clearAllBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to clear all completed tasks?')) {
            try {
                const snapshot = await db.collection('tasks')
                    .where('completed', '==', true)
                    .get();

                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                
                loadTasks();
            }catch (error) {
                console.error('Error clearing tasks:', error);
                alert('Error clearing tasks. Please try again.');
            }
        }
    });

    // Search Tasks
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const tasks = document.querySelectorAll('.task-item');
        
        tasks.forEach(task => {
            const title = task.querySelector('.task-title').textContent.toLowerCase();
            const description = task.querySelector('.task-description').textContent.toLowerCase();
            
            if (title.includes(searchTerm) || description.includes(searchTerm)) {
                task.style.display = 'flex';
            } else {
                task.style.display = 'none';
            }
        });
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            await firebase.auth().signOut();
            window.location.href = 'index.html'; // Redirect to login page after logout
        } catch (error) {
            console.error('Logout error:', error);
            alert('Error logging out. Please try again.');
        }
    });

    // Check user authentication on index2.html load
    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            window.location.href = 'index.html'; // Redirect to login page if not authenticated
        } else {
            loadTasks(); // Only load tasks if the user is authenticated
        }
    });

    // Mobile Navigation
    function toggleSidebar() {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }

    navToggle.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);

    // Close sidebar when clicking a menu item on mobile
    if (window.innerWidth <= 768) {
        menuItems.forEach(item => {
            item.addEventListener('click', () => {
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        });
    }

    // Close sidebar when resizing to desktop view
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    });
});