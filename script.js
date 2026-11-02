/* =========================================
   1. STATE MANAGEMENT (Data & Variables)
========================================= */
//Load tasks from localStorage, or initialize an empty array if none exist
let tasks = JSON.parse(localStorage.getItem('studyPlannerTasks')) || [];

// Load total study time (in seconds) from localStorage
let totalStudyTime = parseInt(localStorage.getItem('studyPlannerTotalTime')) || 0;

// Timer state variables
let timerInterval;
let currentSessionSeconds = 0;
let isTimerRunning = false;


/* =========================================
   2. DOM ELEMENTS SELECTION
========================================= */
// Navigation & Layout
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
const sidebar = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('open-sidebar');
const closeSidebarBtn = document.getElementById('close-sidebar');

// Dashboard Stats Elements
const statTotal = document.getElementById('stat-total');
const statCompleted = document.getElementById('stat-completed');
const statPending = document.getElementById('stat-pending');
const statToday = document.getElementById('stat-today');
const overallProgressBar = document.getElementById('overall-progress-bar');
const overallProgressText = document.getElementById('overall-progress-text');

// Modal & Form Elements
const modal = document.getElementById('task-modal');
const btnAddTaskHeader = document.getElementById('btn-add-task-header');
const btnCancelModal = document.getElementById('btn-cancel-modal');
const closeModal = document.getElementById('close-modal');
const taskForm = document.getElementById('task-form');
const modalTitle = document.getElementById('modal-title');
const subjectList = document.getElementById('subject-list');

// Task List & Filter Elements
const taskListContainer = document.getElementById('task-list');
const searchInput = document.getElementById('search-input');
const filterSubject = document.getElementById('filter-subject');
const filterPriority = document.getElementById('filter-priority');
const filterStatus = document.getElementById('filter-status');

// Timer Elements
const timerDisplay = document.getElementById('timer-display');
const btnTimerStart = document.getElementById('btn-timer-start');
const btnTimerPause = document.getElementById('btn-timer-pause');
const btnTimerReset = document.getElementById('btn-timer-reset');
const totalTimeDisplay = document.getElementById('total-time-display');


/* =========================================
   3. INITIALIZATION
========================================= */
// Run when the HTML document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();           // Update statistics
    populateSubjectFilters();    // Populate subject dropdowns based on existing tasks
    renderTasks();               // Display task cards
    updateTotalTimeDisplay();    // Show saved study time
    btnTimerPause.disabled = true; // Disable pause button initially
});


/* =========================================
   4. NAVIGATION & LAYOUT LOGIC
========================================= */
// Handle Sidebar link clicks
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Remove active class from all links and sections
        navItems.forEach(nav => nav.classList.remove('active'));
        sections.forEach(sec => sec.classList.remove('active'));
        
        // Add active class to clicked link and corresponding section
        item.classList.add('active');
        const targetId = item.getAttribute('data-target');
        document.getElementById(targetId).classList.add('active');

        // Close sidebar automatically on mobile devices
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
    });
});

// Mobile Sidebar Toggle
openSidebarBtn.addEventListener('click', () => sidebar.classList.add('active'));
closeSidebarBtn.addEventListener('click', () => sidebar.classList.remove('active'));


/* =========================================
   5. MODAL LOGIC (Open/Close/Populate)
========================================= */
function openModal(isEdit = false, task = null) {
    modal.classList.add('active'); // Show modal
    
    if (isEdit && task) {
        // Editing mode: Populate form with task data
        modalTitle.textContent = 'Edit Task';
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-subject').value = task.subject;
        document.getElementById('task-due-date').value = task.dueDate;
        document.getElementById('task-desc').value = task.description;
        // Check the correct priority radio button
        document.querySelector(`input[name="task-priority"][value="${task.priority}"]`).checked = true;
    } else {
        // Add mode: Reset form to default
        modalTitle.textContent = 'Add New Task';
        taskForm.reset();
        document.getElementById('task-id').value = '';
        // Set default due date to today
        document.getElementById('task-due-date').value = new Date().toISOString().split('T')[0];
    }
}

function closeTaskModal() {
    modal.classList.remove('active'); // Hide modal
}

// Event Listeners for Modal
btnAddTaskHeader.addEventListener('click', () => openModal(false));
btnCancelModal.addEventListener('click', closeTaskModal);
closeModal.addEventListener('click', closeTaskModal);

// Close modal if user clicks outside the modal content window
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeTaskModal();
});


/* =========================================
   6. TASK CRUD OPERATIONS (Create, Read, Update, Delete)
========================================= */
// Handle Form Submission (Add or Edit)
taskForm.addEventListener('submit', (e) => {
    e.preventDefault(); // Prevent page reload
    
    // Retrieve input values
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value.trim();
    const subject = document.getElementById('task-subject').value.trim() || 'General';
    const dueDate = document.getElementById('task-due-date').value;
    const priority = document.querySelector('input[name="task-priority"]:checked').value;
    const description = document.getElementById('task-desc').value.trim();

    if (id) {
        // Update existing task
        const index = tasks.findIndex(t => t.id === id);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], title, subject, dueDate, priority, description };
        }
    } else {
        // Create new task object
        const newTask = {
            id: Date.now().toString(), // Generate unique ID based on timestamp
            title,
            subject,
            dueDate,
            priority,
            description,
            completed: false,
            createdAt: new Date().toISOString()
        };
        tasks.push(newTask);
    }

    // Save and Update UI
    saveTasks();
    updateDashboard();
    populateSubjectFilters();
    renderTasks();
    closeTaskModal();
});

// Toggle Task Complete/Pending Status
window.toggleTaskStatus = function(id) { // Attached to window for inline HTML onclick access
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        updateDashboard();
        renderTasks();
    }
}

// Setup task for editing
window.editTask = function(id) {
    const task = tasks.find(t => t.id === id);
    if (task) openModal(true, task);
}

// Delete a task
window.deleteTask = function(id) {
    if (confirm('Are you sure you want to delete this task?')) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        updateDashboard();
        populateSubjectFilters();
        renderTasks();
    }
}

// Save tasks array to LocalStorage
function saveTasks() {
    localStorage.setItem('studyPlannerTasks', JSON.stringify(tasks));
}


/* =========================================
   7. DASHBOARD & UI UPDATES
========================================= */
function updateDashboard() {
    // Calculate statistics
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    
    // Calculate today's tasks
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(t => t.dueDate === todayStr).length;

    // Update text elements
    statTotal.textContent = total;
    statCompleted.textContent = completed;
    statPending.textContent = pending;
    statToday.textContent = todayTasks;

    // Update Progress Bar
    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
    overallProgressBar.style.width = `${progressPercent}%`;
    overallProgressText.textContent = `${progressPercent}% Completed`;
}


/* =========================================
   8. FILTERING & RENDERING TASKS
========================================= */
function populateSubjectFilters() {
    // Extract unique subjects from tasks
    const subjects = [...new Set(tasks.map(t => t.subject))];
    
    // Populate form datalist (Autocomplete)
    subjectList.innerHTML = '';
    subjects.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        subjectList.appendChild(option);
    });

    // Populate filter dropdown in Tasks Section
    const currentFilterVal = filterSubject.value; // Remember current selection
    filterSubject.innerHTML = '<option value="all">All Subjects</option>';
    
    subjects.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        filterSubject.appendChild(option);
    });
    
    // Restore selection if it still exists
    if (subjects.includes(currentFilterVal)) {
        filterSubject.value = currentFilterVal;
    }
}

function renderTasks() {
    // Get filter values
    const searchTerm = searchInput.value.toLowerCase();
    const subjectFilter = filterSubject.value;
    const priorityFilter = filterPriority.value;
    const statusFilter = filterStatus.value;

    // Filter tasks array
    const filteredTasks = tasks.filter(task => {
        const matchesSearch = task.title.toLowerCase().includes(searchTerm) || 
                              task.description.toLowerCase().includes(searchTerm);
        const matchesSubject = subjectFilter === 'all' || task.subject === subjectFilter;
        const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
        
        let matchesStatus = true;
        if (statusFilter === 'completed') matchesStatus = task.completed;
        if (statusFilter === 'pending') matchesStatus = !task.completed;

        return matchesSearch && matchesSubject && matchesPriority && matchesStatus;
    });

    // Sort tasks by due date (ascending)
    filteredTasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    // Clear current list
    taskListContainer.innerHTML = '';

    // Empty state
    if (filteredTasks.length === 0) {
        taskListContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list"></i>
                <p>No tasks found. Add a new task or change your filters!</p>
            </div>
        `;
        return;
    }

    // Generate HTML for each task
    filteredTasks.forEach(task => {
        const taskEl = document.createElement('div');
        // Add CSS classes for styling based on status and priority
        taskEl.className = `task-card priority-${task.priority} ${task.completed ? 'completed' : ''}`;
        
        // Date formatting and overdue checking logic
        const dueDateObj = new Date(task.dueDate);
        const todayObj = new Date();
        todayObj.setHours(0,0,0,0); // Normalize time for accurate comparison
        
        let dueClass = '';
        let dueText = dueDateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        
        if (dueDateObj < todayObj && !task.completed) {
            dueClass = 'overdue';
            dueText = 'Overdue: ' + dueText;
        } else if (dueDateObj.getTime() === todayObj.getTime()) {
            dueClass = 'today';
            dueText = 'Today';
        }

        // Inner HTML of the Task Card
        taskEl.innerHTML = `
            <div class="task-header">
                <div>
                    <h3 class="task-title">${task.title}</h3>
                    <span class="task-subject">${task.subject}</span>
                </div>
            </div>
            ${task.description ? `<p class="task-desc">${task.description}</p>` : ''}
            <div class="task-meta">
                <span class="task-priority"><i class="fas fa-flag"></i> ${task.priority}</span>
                <span class="task-due ${dueClass}"><i class="far fa-calendar-alt"></i> ${dueText}</span>
            </div>
            <div class="task-actions">
                <button class="action-btn btn-complete" onclick="toggleTaskStatus('${task.id}')" title="Mark as ${task.completed ? 'Pending' : 'Completed'}">
                    <i class="fas ${task.completed ? 'fa-undo' : 'fa-check'}"></i> ${task.completed ? 'Undo' : 'Complete'}
                </button>
                <button class="action-btn btn-edit" onclick="editTask('${task.id}')" title="Edit Task">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')" title="Delete Task">
                    <i class="fas fa-trash-alt"></i> Delete
                </button>
            </div>
        `;
        taskListContainer.appendChild(taskEl);
    });
}

// Attach event listeners to filter inputs so list updates automatically when they change
searchInput.addEventListener('input', renderTasks);
filterSubject.addEventListener('change', renderTasks);
filterPriority.addEventListener('change', renderTasks);
filterStatus.addEventListener('change', renderTasks);


/* =========================================
   9. STUDY TIMER LOGIC
========================================= */
// Convert seconds into HH:MM:SS string
function formatTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Convert seconds into user-friendly "Xh Ym" string
function formatTotalTime(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
}

// Update the large timer display
function updateTimerDisplay() {
    timerDisplay.textContent = formatTime(currentSessionSeconds);
}

// Update the total study time text
function updateTotalTimeDisplay() {
    totalTimeDisplay.textContent = formatTotalTime(totalStudyTime);
}

// Start Timer
function startTimer() {
    if (!isTimerRunning) {
        isTimerRunning = true;
        
        timerInterval = setInterval(() => {
            currentSessionSeconds++;
            totalStudyTime++;
            updateTimerDisplay();
            
            // Save total time to local storage every 60 seconds (1 min) to prevent data loss
            if (totalStudyTime % 60 === 0) {
                localStorage.setItem('studyPlannerTotalTime', totalStudyTime);
                updateTotalTimeDisplay();
            }
        }, 1000); // 1000ms = 1 second
        
        // Toggle button states
        btnTimerStart.disabled = true;
        btnTimerPause.disabled = false;
    }
}

// Pause Timer
function pauseTimer() {
    if (isTimerRunning) {
        clearInterval(timerInterval); // Stop the interval
        isTimerRunning = false;
        
        // Save current progress on pause
        localStorage.setItem('studyPlannerTotalTime', totalStudyTime);
        updateTotalTimeDisplay();
        
        // Toggle button states
        btnTimerStart.disabled = false;
        btnTimerPause.disabled = true;
    }
}

// Reset Current Session (Does not reset total history)
function resetTimer() {
    pauseTimer(); // Stop timer first
    currentSessionSeconds = 0;
    updateTimerDisplay();
}

// Timer Event Listeners
btnTimerStart.addEventListener('click', startTimer);
btnTimerPause.addEventListener('click', pauseTimer);
btnTimerReset.addEventListener('click', resetTimer);
