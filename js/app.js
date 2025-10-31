const newTaskInput = document.getElementById("newTaskInput");
const addBtn = document.getElementById("addBtn");
const list = document.getElementById("list");
const statusBar = document.getElementById("title-bar-status-indicator");

// Elementos del DOM - con verificación de existencia
const themeToggle = document.getElementById("themeToggle");
const viewToggle = document.getElementById("viewToggle");
const calendarView = document.getElementById("calendarView");
const listView = document.getElementById("listView");
const currentMonthElement = document.getElementById("currentMonth");
const calendarElement = document.getElementById("calendar");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

// Filtros - con verificación
const filterPriority = document.getElementById("filterPriority");
const filterCategory = document.getElementById("filterCategory");
const clearFilters = document.getElementById("clearFilters");

// Estadísticas - con verificación
const totalTasksElement = document.getElementById("totalTasks");
const completedTasksElement = document.getElementById("completedTasks");
const pendingTasksElement = document.getElementById("pendingTasks");

// Modal - con verificación
const editModal = document.getElementById("editModal");
const editTaskInput = document.getElementById("editTaskInput");
const editStartDate = document.getElementById("editStartDate");
const editDueDate = document.getElementById("editDueDate");
const editPriority = document.getElementById("editPriority");
const editCategory = document.getElementById("editCategory");
const saveEdit = document.getElementById("saveEdit");
const cancelEdit = document.getElementById("cancelEdit");

// Elementos del formulario - CORREGIDOS
const startDateInput = document.getElementById("startDateInput");
const dueDateInput = document.getElementById("dueDateInput");
const priorityInput = document.getElementById("priorityInput");
const categoryInput = document.getElementById("categoryInput");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();
let editingTaskId = null;
let deferredPrompt = null;

// Inicialización
window.addEventListener("load", () => {
    loadTheme();
    renderTasks();
    updateConnection();
    updateStats();
    if (calendarView) renderCalendar();
    registerSW();
    requestGeo();
    
    // Configurar event listeners solo si los elementos existen
    setupEventListeners();
});

// Configurar event listeners con verificaciones
function setupEventListeners() {
    // Navegación y UI
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);
    if (viewToggle) viewToggle.addEventListener("click", toggleView);
    if (prevMonthBtn) prevMonthBtn.addEventListener("click", previousMonth);
    if (nextMonthBtn) nextMonthBtn.addEventListener("click", nextMonth);
    
    // Filtros
    if (filterPriority) filterPriority.addEventListener("change", applyFilters);
    if (filterCategory) filterCategory.addEventListener("change", applyFilters);
    if (clearFilters) clearFilters.addEventListener("click", clearAllFilters);
    
    // Modal de edición
    if (saveEdit) saveEdit.addEventListener("click", saveTaskEdit);
    if (cancelEdit) cancelEdit.addEventListener("click", closeEditModal);
    
    // Cerrar modal al hacer clic fuera
    if (editModal) {
        editModal.addEventListener("click", (e) => {
            if (e.target === editModal) closeEditModal();
        });
    }
}

// Tema claro/oscuro - CON VERIFICACIÓN
function loadTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    document.body.setAttribute("data-theme", savedTheme);
    updateThemeButton(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute("data-theme");
    const newTheme = currentTheme === "light" ? "dark" : "light";
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeButton(newTheme);
}

function updateThemeButton(theme) {
    if (themeToggle) {
        themeToggle.textContent = theme === "light" ? "🌙" : "☀️";
    }
}

// Vista lista/calendario - CON VERIFICACIÓN
function toggleView() {
    if (!calendarView || !listView) return;
    
    const isCalendarView = !calendarView.classList.contains("hidden");
    
    if (isCalendarView) {
        calendarView.classList.add("hidden");
        listView.classList.remove("hidden");
        if (viewToggle) viewToggle.textContent = "📅";
    } else {
        calendarView.classList.remove("hidden");
        listView.classList.add("hidden");
        if (viewToggle) viewToggle.textContent = "📝";
        renderCalendar();
    }
}

// Calendario - CON VERIFICACIÓN
function renderCalendar() {
    if (!calendarElement || !currentMonthElement) return;
    
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();

    currentMonthElement.textContent = 
        `${firstDay.toLocaleString('es-ES', { month: 'long' })} ${currentYear}`.toUpperCase();

    let calendarHTML = '<div class="calendar-grid">';
    
    // Días de la semana
    const weekdays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    weekdays.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });

    // Días vacíos al inicio
    for (let i = 0; i < startingDay; i++) {
        calendarHTML += `<div class="calendar-day other-month"></div>`;
    }

    // Días del mes
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasTasks = tasks.some(task => 
            (task.fechaInicio === dateStr || task.fechaVencimiento === dateStr) && !task.completado
        );
        
        const dayClass = hasTasks ? 'calendar-day has-tasks' : 'calendar-day';
        calendarHTML += `
            <div class="${dayClass}" data-date="${dateStr}">
                ${day}
                ${hasTasks ? '📌' : ''}
            </div>`;
    }

    calendarHTML += '</div>';
    calendarElement.innerHTML = calendarHTML;

    // Agregar event listeners a los días
    document.querySelectorAll('.calendar-day[data-date]').forEach(day => {
        day.addEventListener('click', () => {
            const date = day.getAttribute('data-date');
            filterByDate(date);
            toggleView();
        });
    });
}

function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    renderCalendar();
}

function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    renderCalendar();
}

// Filtros - CON VERIFICACIÓN
function applyFilters() {
    renderTasks();
    updateStats();
}

function clearAllFilters() {
    if (filterPriority) filterPriority.value = 'todas';
    if (filterCategory) filterCategory.value = 'todas';
    applyFilters();
}

function filterByDate(date) {
    tasks.forEach(task => {
        if (task.fechaInicio === date || task.fechaVencimiento === date) {
            console.log('Tarea para esta fecha:', task);
        }
    });
}

// Gestión de tareas - CORREGIDO
function renderTasks() {
    if (!list) return;
    
    const priorityFilter = filterPriority ? filterPriority.value : 'todas';
    const categoryFilter = filterCategory ? filterCategory.value : 'todas';
    
    let filteredTasks = tasks.filter(task => {
        if (priorityFilter !== 'todas' && task.prioridad !== priorityFilter) return false;
        if (categoryFilter !== 'todas' && task.categoria !== categoryFilter) return false;
        return true;
    });

    list.innerHTML = "";
    
    if (filteredTasks.length === 0) {
        list.innerHTML = `<li class="empty">No hay tareas que coincidan con los filtros. 💤</li>`;
        return;
    }

    // Ordenar tareas
    filteredTasks.sort((a, b) => {
        if (a.completado !== b.completado) return a.completado ? 1 : -1;
        if (a.prioridad !== b.prioridad) {
            const priorityOrder = { urgente: 0, alta: 1, media: 2, baja: 3 };
            return priorityOrder[a.prioridad] - priorityOrder[b.prioridad];
        }
        return new Date(a.fechaVencimiento) - new Date(b.fechaVencimiento);
    });

    filteredTasks.forEach(task => {
        const li = createTaskElement(task);
        list.appendChild(li);
    });
}

function createTaskElement(task) {
    const li = document.createElement("li");
    
    // VALORES POR DEFECTO PARA PROPIEDADES FALTANTES - CORREGIDO
    const prioridad = task.prioridad || 'media';
    const categoria = task.categoria || 'personal';
    const fechaInicio = task.fechaInicio || '';
    const fechaVencimiento = task.fechaVencimiento || '';
    
    const isOverdue = fechaVencimiento && new Date(fechaVencimiento) < new Date() && !task.completado;
    
    if (isOverdue) li.classList.add("overdue");
    if (task.completado) li.classList.add("done");

    li.innerHTML = `
        <label>
            <input type="checkbox" ${task.completado ? "checked" : ""}>
            <div class="task-content">
                <span class="task-text">${task.texto}</span>
                <div class="task-meta">
                    <span class="task-badge priority-${prioridad}">${prioridad.toUpperCase()}</span>
                    <span class="task-badge category-badge">${categoria}</span>
                    ${fechaInicio ? `<span class="task-badge date-badge">Inicio: ${formatDate(fechaInicio)}</span>` : ''}
                    ${fechaVencimiento ? `<span class="task-badge date-badge">Fin: ${formatDate(fechaVencimiento)}</span>` : ''}
                    ${isOverdue ? '<span class="task-badge" style="background: #ef4444; color: white;">⚠️ VENCIDA</span>' : ''}
                </div>
            </div>
        </label>
        <div class="actions">
            <button class="edit" title="Editar">✏️</button>
            <button class="copy" title="Copiar">📋</button>
            <button class="share" title="Compartir">✉️</button>
            <button class="delete" title="Eliminar">🗑️</button>
        </div>
    `;

    // Event listeners
    li.querySelector("input").addEventListener("change", () => toggleTask(task.id));
    li.querySelector(".delete").addEventListener("click", () => deleteTask(task.id));
    li.querySelector(".copy").addEventListener("click", () => copyTask(task.texto));
    li.querySelector(".share").addEventListener("click", () => shareTask(task));
    li.querySelector(".edit").addEventListener("click", () => openEditModal(task));

    return li;
}

function formatDate(dateString) {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-ES');
}

// Modal de edición - CON VERIFICACIÓN
function openEditModal(task) {
    if (!editModal) return;
    
    editingTaskId = task.id;
    if (editTaskInput) editTaskInput.value = task.texto;
    if (editStartDate) editStartDate.value = task.fechaInicio || '';
    if (editDueDate) editDueDate.value = task.fechaVencimiento || '';
    if (editPriority) editPriority.value = task.prioridad || 'media';
    if (editCategory) editCategory.value = task.categoria || 'personal';
    editModal.classList.remove("hidden");
}

function closeEditModal() {
    if (!editModal) return;
    editModal.classList.add("hidden");
    editingTaskId = null;
}

function saveTaskEdit() {
    if (!editingTaskId || !editTaskInput) return;

    const updatedText = editTaskInput.value.trim();
    if (!updatedText) return;

    tasks = tasks.map(task => 
        task.id === editingTaskId 
            ? {
                ...task,
                texto: updatedText,
                fechaInicio: editStartDate ? editStartDate.value : task.fechaInicio,
                fechaVencimiento: editDueDate ? editDueDate.value : task.fechaVencimiento,
                prioridad: editPriority ? editPriority.value : task.prioridad,
                categoria: editCategory ? editCategory.value : task.categoria
            }
            : task
    );

    saveTasks();
    renderTasks();
    updateStats();
    closeEditModal();
}

// Funciones principales de tareas - CORREGIDAS
function saveTasks() {
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

function addTask(texto, fechaInicio, fechaVencimiento, prioridad, categoria) {
    const task = { 
        id: Date.now(), 
        texto, 
        completado: false,
        fechaInicio: fechaInicio || null,
        fechaVencimiento: fechaVencimiento || null,
        prioridad: prioridad || 'media',
        categoria: categoria || 'personal',
        fechaCreacion: new Date().toISOString()
    };
    tasks.push(task);
    saveTasks();
    renderTasks();
    updateStats();
}

function toggleTask(id) {
    tasks = tasks.map(t => t.id === id ? { ...t, completado: !t.completado } : t);
    saveTasks();
    renderTasks();
    updateStats();
}

function deleteTask(id) {
    if (confirm("¿Estás seguro de que quieres eliminar esta tarea?")) {
        tasks = tasks.filter(t => t.id !== id);
        saveTasks();
        renderTasks();
        updateStats();
    }
}

// Estadísticas - CON VERIFICACIÓN
function updateStats() {
    if (!totalTasksElement || !completedTasksElement || !pendingTasksElement) return;
    
    const total = tasks.length;
    const completed = tasks.filter(t => t.completado).length;
    const pending = total - completed;

    totalTasksElement.textContent = `Total: ${total}`;
    completedTasksElement.textContent = `Completadas: ${completed}`;
    pendingTasksElement.textContent = `Pendientes: ${pending}`;
}

// Compartir tarea
function shareTask(task) {
    const taskText = `Tarea: ${task.texto}
Prioridad: ${task.prioridad || 'media'}
Categoría: ${task.categoria || 'personal'}
${task.fechaInicio ? `Fecha inicio: ${formatDate(task.fechaInicio)}` : ''}
${task.fechaVencimiento ? `Fecha vencimiento: ${formatDate(task.fechaVencimiento)}` : ''}
Estado: ${task.completado ? 'Completada' : 'Pendiente'}`;

    if (navigator.share) {
        navigator.share({
            title: "Mi Tarea",
            text: taskText
        });
    } else {
        copyTask(taskText);
        alert("Texto de la tarea copiado al portapapeles");
    }
}

// Copiar texto
function copyTask(texto) {
    navigator.clipboard.writeText(texto).then(() => {
        console.log("Texto copiado al portapapeles");
    });
}

// Event listener para agregar tarea - CORREGIDO
if (addBtn && newTaskInput) {
    addBtn.addEventListener("click", e => {
        e.preventDefault();
        const text = newTaskInput.value.trim();
        if (!text) return;

        const startDate = startDateInput ? startDateInput.value : '';
        const dueDate = dueDateInput ? dueDateInput.value : '';
        const priority = priorityInput ? priorityInput.value : 'media';
        const category = categoryInput ? categoryInput.value : 'personal';

        addTask(text, startDate, dueDate, priority, category);
        
        // Limpiar formulario
        newTaskInput.value = "";
        if (startDateInput) startDateInput.value = "";
        if (dueDateInput) dueDateInput.value = "";
        if (priorityInput) priorityInput.value = "media";
        if (categoryInput) categoryInput.value = "personal";
        
        newTaskInput.focus();
    });
}

// Estado de conexión
function updateConnection() {
    if (!statusBar) return;
    
    const online = navigator.onLine;
    statusBar.textContent = online ? "Online" : "Offline";
    statusBar.className = online ? "status online" : "status offline";
}

window.addEventListener("online", updateConnection);
window.addEventListener("offline", updateConnection);

// Service Worker
function registerSW() {
    if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("serviceWorker.js")
            .then(registration => console.log("SW registrado: ", registration))
            .catch(error => console.log("Error SW: ", error));
    }
}

// Geolocalización
function requestGeo() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            localStorage.setItem("geo", JSON.stringify({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude
            }));
        });
    }
}

// Instalación PWA
window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredPrompt = e;
});

// Teclado rápido
document.addEventListener("keydown", e => {
    if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        if (newTaskInput) newTaskInput.focus();
    }
});

// Enter para agregar tarea
if (newTaskInput) {
    newTaskInput.addEventListener("keypress", e => {
        if (e.key === "Enter") {
            e.preventDefault();
            if (addBtn) addBtn.click();
        }
    });
}