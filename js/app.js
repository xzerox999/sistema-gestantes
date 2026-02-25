const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbxIoz0dZQ3q9eqOp_i1ZBJshcK80rzHzyghtxRXCGjP_1F1FrVxhBklaSnmvvQedPOH/exec',
    HOSPITAL_ID: '000025210'
};

const app = {
    user: null,
    currentGestante: null,
    dataTable: null,

    init() {
        this.checkAuth();
        this.setupEventListeners();
    },

    setupEventListeners() {
        const loginForm = document.getElementById('form-login');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.login(e));
        }
    },

    checkAuth() {
        const savedUser = localStorage.getItem('gestantes_user');
        if (savedUser) {
            try {
                this.user = JSON.parse(savedUser);
                this.showDashboard();
            } catch (e) {
                console.error("Error parseando sesión:", e);
                this.showLogin();
            }
        } else {
            this.showLogin();
        }
    },

    async login(event) {
        if (event) event.preventDefault();

        const emailEl = document.getElementById('login-email');
        const dniEl = document.getElementById('login-dni');

        if (!emailEl || !dniEl) {
            console.error("Crítico: No se encontraron los campos de texto");
            Swal.fire('Error Interno', 'No se pudieron encontrar los campos de login.', 'error');
            return;
        }

        const email = emailEl.value.trim();
        const dni = dniEl.value.trim();

        if (!email || !dni) {
            Swal.fire('Campos vacíos', 'Ingresa usuario y contraseña.', 'warning');
            return;
        }

        Swal.fire({
            title: 'Validando...',
            didOpen: () => Swal.showLoading()
        });

        const res = await this.fetchData('usuarios', 'read');

        if (res.success) {
            const foundUser = res.data.find(u =>
                u.correo.trim().toLowerCase() === email.toLowerCase() &&
                String(u.dni).trim() === String(dni)
            );

            if (foundUser) {
                const estId = String(foundUser.establecimiento_id).trim().padStart(9, '0');
                this.user = {
                    name: foundUser.nombre_completo,
                    email: foundUser.correo,
                    establecimiento_id: estId,
                    role: estId === CONFIG.HOSPITAL_ID ? 'hospital' : 'eess'
                };
                // Cargar nombre del establecimiento
                const resEst = await this.fetchData('establecimientos', 'read');
                if (resEst.success && resEst.data) {
                    const est = resEst.data.find(e => String(e.id).trim().padStart(9, '0') === estId);
                    if (est) this.user.establecimiento_nombre = est.nombre;
                }

                localStorage.setItem('gestantes_user', JSON.stringify(this.user));

                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: `${this.user.name} | ${this.user.establecimiento_nombre || ''}`,
                    timer: 1500,
                    showConfirmButton: false
                });
                this.showDashboard();
            } else {
                Swal.fire('Error', 'Correo o DNI incorrectos.', 'error');
            }
        } else {
            Swal.fire('Error', 'No hay conexión con la base de datos.', 'error');
        }
    },

    logout() {
        localStorage.removeItem('gestantes_user');
        window.location.reload(); // Recarga limpia
    },

    showView(viewId) {
        ['login-view', 'dashboard-view'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.display = (id === viewId) ? 'block' : 'none';
            }
        });
    },

    showLogin() {
        const profile = document.getElementById('user-profile');
        if (profile) profile.style.display = 'none';
        this.showView('login-view');
    },

    showDashboard() {
        const nameEl = document.getElementById('user-name');
        const profileEl = document.getElementById('user-profile');
        if (nameEl) {
            const estName = this.user.establecimiento_nombre ? ` | ${this.user.establecimiento_nombre}` : '';
            nameEl.textContent = `${this.user.name}${estName} (${this.user.establecimiento_id})`;
            nameEl.classList.add('text-slate-800', 'font-bold'); // Asegurar visibilidad
        }
        if (profileEl) profileEl.style.display = 'flex';
        this.showView('dashboard-view');
        this.renderDashboard();
    },

    async fetchData(sheet, action = 'read', payload = null) {
        try {
            const url = new URL(CONFIG.API_URL);
            if (action === 'read') {
                url.searchParams.append('action', 'read');
                url.searchParams.append('sheet', sheet);
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                return { success: true, data: data.data || data }; // Manejar ambos casos de respuesta del script
            } else {
                const response = await fetch(CONFIG.API_URL, {
                    method: 'POST',
                    mode: 'no-cors',
                    body: JSON.stringify({ action, sheet, payload })
                });
                return { success: true, message: 'OK' };
            }
        } catch (error) {
            console.error("Error en fetchData:", error);
            return { success: false, message: error.message };
        }
    },

    renderDashboard() {
        console.log("Rendering Dashboard for role:", this.user.role, "ID:", this.user.establecimiento_id);
        const content = document.getElementById('dashboard-content');
        if (!content) return;

        if (this.user.role === 'hospital') {
            this.renderHospitalDashboard(content);
        } else {
            this.renderEESSDashboard(content);
        }
    },

    renderEESSDashboard(container) {
        container.innerHTML = `
            <div class="mb-8 flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                <button onclick="app.switchTab('eess-new')" id="tab-eess-new" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-white shadow-sm text-primary">Nuevo Registro</button>
                <button onclick="app.switchTab('eess-history')" id="tab-eess-history" class="px-6 py-2.5 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50">Mi Historial</button>
            </div>

            <div id="section-eess-new" class="dashboard-section">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <h3 class="text-xl font-bold text-slate-800 mb-2">Paso 1: Registro de Gestante</h3>
                        <p class="text-slate-500 mb-6 text-sm">Verifica si la gestante ya existe o regístrala.</p>
                        <form id="form-gestante" onsubmit="app.handleGestanteSubmit(event)" class="space-y-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">DNI</label>
                                    <input type="text" name="dni" required class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-medium" placeholder="42327868">
                                </div>
                                <div>
                                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Nombres Completos</label>
                                    <input type="text" name="nombres" required class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                                </div>
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Teléfono</label>
                                <input type="text" name="telefono" required class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 transition-all font-medium">
                            </div>
                            <button type="submit" class="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/25">
                                Validar y Continuar
                            </button>
                        </form>
                    </div>
                    <div id="referencia-section" class="bg-slate-50 p-8 rounded-2xl border border-dashed border-slate-200 opacity-50 pointer-events-none transition-all">
                        <h3 class="text-xl font-bold text-slate-400 mb-2">Paso 2: Crear Referencia</h3>
                        <p class="text-slate-400 text-sm italic">Completa el paso 1 primero.</p>
                    </div>
                </div>
            </div>

            <div id="section-eess-history" class="dashboard-section hidden">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-slate-800">Mis Referencias Enviadas</h3>
                        <button onclick="app.loadEESSHistory()" class="text-primary font-bold text-sm">Refrescar</button>
                    </div>
                    <div class="overflow-x-auto">
                        <table id="table-eess-history" class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-slate-400 text-xs font-bold uppercase border-b border-slate-50">
                                    <th class="pb-4">Ref #</th>
                                    <th class="pb-4">Gestante</th>
                                    <th class="pb-4">Estado</th>
                                    <th class="pb-4">Cita</th>
                                    <th class="pb-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="eess-history-list" class="text-slate-600 divide-y divide-slate-50"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    switchTab(tabId) {
        document.querySelectorAll('.dashboard-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`section-${tabId}`).classList.remove('hidden');

        // UI Tabs
        const parent = document.getElementById(`tab-${tabId}`).parentElement;
        parent.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-white', 'shadow-sm', 'text-primary');
            b.classList.add('text-slate-500', 'hover:bg-white/50');
        });
        const active = document.getElementById(`tab-${tabId}`);
        active.classList.add('bg-white', 'shadow-sm', 'text-primary');
        active.classList.remove('text-slate-500', 'hover:bg-white/50');

        if (tabId === 'eess-history') this.loadEESSHistory();
    },

    async loadEESSHistory() {
        Swal.fire({ title: 'Cargando historial...', didOpen: () => Swal.showLoading() });
        const [resRef, resGest, resCitas] = await Promise.all([
            this.fetchData('referencias', 'read'),
            this.fetchData('gestantes', 'read'),
            this.fetchData('citas', 'read')
        ]);
        Swal.close();

        const list = document.getElementById('eess-history-list');
        const mías = (resRef.data || []).filter(r => String(r.establecimiento_origen_id).padStart(9, '0') === this.user.establecimiento_id);

        list.innerHTML = mías.map(ref => {
            const gest = resGest.data?.find(g => g.id === ref.gestante_id) || { nombres: 'N/A' };
            const cita = resCitas.data?.find(c => c.referencia_id === ref.id && c['estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)'] === 'PROGRAMADA');
            const atendida = resCitas.data?.some(c => c.referencia_id === ref.id && c['estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)'] === 'ASISTIO');

            return `
                <tr class="hover:bg-slate-50">
                    <td class="py-4 font-bold text-sm">${ref.numero_correlativo}</td>
                    <td class="py-4">
                        <p class="font-semibold text-slate-700">${gest.nombres}</p>
                        <span class="text-[10px] text-slate-400">${ref.motivo_referencia}</span>
                    </td>
                    <td class="py-4">
                        <span class="px-2 py-1 rounded-full text-[10px] font-bold ${ref['estado (ACTIVA/CERRADA)'] === 'ACTIVA' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-400'}">
                            ${ref['estado (ACTIVA/CERRADA)']}
                        </span>
                    </td>
                    <td class="py-4 text-xs">
                        ${cita ? `${new Date(cita.fecha).toLocaleDateString()} ${new Date(cita.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                    </td>
                    <td class="py-4 text-right flex justify-end gap-1">
                        ${!atendida ? `
                            <button onclick="app.reprogramarReferencia('${ref.id}', '${cita?.id}', '${cita?.horario_id}')" class="text-blue-400 hover:text-blue-600 p-2" title="Reprogramar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
                            <button onclick="app.eliminarReferencia('${ref.id}', '${cita?.id}', '${cita?.horario_id}')" class="text-red-400 hover:text-red-600 p-2" title="Eliminar"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                        ` : ''}
                    </td>
                </tr>
            `;
        }).join('');
    },

    async reprogramarReferencia(refId, citaId, oldSlotId) {
        Swal.fire({ title: 'Cargando horarios...', didOpen: () => Swal.showLoading() });
        const resSlots = await this.fetchData('horario', 'read');
        const slotsDisponibles = (resSlots.data || []).filter(s => s.estado === 'libre');
        Swal.close();

        const { value: newSlotId } = await Swal.fire({
            title: 'Reprogramar Cita',
            html: `
                <select id="swal-new-slot" class="swal2-select">
                    <option value="">Seleccione nuevo horario...</option>
                    ${slotsDisponibles.map(s => `<option value="${s.id}">${new Date(s.fecha).toLocaleDateString()} - ${new Date(s.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</option>`).join('')}
                </select>
            `,
            preConfirm: () => document.getElementById('swal-new-slot').value
        });

        if (newSlotId) {
            Swal.fire({ title: 'Actualizando...', didOpen: () => Swal.showLoading() });
            const slot = resSlots.data.find(s => String(s.id) === String(newSlotId));

            await Promise.all([
                this.fetchData('citas', 'update', {
                    id: citaId,
                    fecha: slot.fecha,
                    hora: slot.hora,
                    horario_id: newSlotId
                }),
                this.fetchData('horario', 'update', { id: newSlotId, estado: 'copado' }),
                oldSlotId ? this.fetchData('horario', 'update', { id: oldSlotId, estado: 'libre' }) : Promise.resolve()
            ]);

            Swal.fire('Éxito', 'Cita reprogramada correctamente.', 'success');
            this.loadEESSHistory();
        }
    },

    async eliminarReferencia(refId, citaId, slotId) {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar Referencia?',
            text: "Esta acción liberará el horario y borrará la cita programada.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (!isConfirmed) return;

        Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });

        // En DriveDB/AppScript, eliminar suele ser marcar como inactivo o borrar fila.
        // Aquí usaremos 'delete' si el backend soporta, o simplemente ignoraremos.
        // Asumiendo que podemos enviar action: 'delete'
        await Promise.all([
            this.fetchData('referencias', 'delete', { id: refId }),
            citaId ? this.fetchData('citas', 'delete', { id: citaId }) : Promise.resolve(),
            slotId ? this.fetchData('horario', 'update', { id: slotId, estado: 'libre' }) : Promise.resolve()
        ]);

        Swal.fire('Eliminado', 'La referencia ha sido eliminada.', 'success');
        this.loadEESSHistory();
    },

    async handleGestanteSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        Swal.fire({ title: 'Buscando...', didOpen: () => Swal.showLoading() });

        const res = await this.fetchData('gestantes', 'read');
        let gestante = res.data?.find(g => String(g.dni) === String(data.dni));

        if (!gestante) {
            data.id = "G-" + Date.now();
            const saveRes = await this.fetchData('gestantes', 'create', data);
            gestante = data;
        }

        this.currentGestante = gestante;
        Swal.fire({ icon: 'success', title: 'Gestante identificada', text: gestante.nombres, timer: 1500 });
        this.unlockReferenciaForm();
    },

    async unlockReferenciaForm() {
        const section = document.getElementById('referencia-section');
        section.classList.remove('opacity-50', 'pointer-events-none', 'bg-slate-50', 'border-dashed');
        section.classList.add('bg-white', 'shadow-sm', 'border-slate-100');

        // Cargar horarios disponibles
        const resSlots = await this.fetchData('horario', 'read');
        if (!resSlots.success) {
            Swal.fire('Error', 'No se pudieron cargar los horarios. Verifica tu conexión.', 'error');
            return;
        }
        const slotsDisponibles = (resSlots.data || []).filter(s => s.estado === 'libre');

        section.innerHTML = `
            <h3 class="text-xl font-bold text-slate-800 mb-2">Paso 2: Referencia para ${this.currentGestante.nombres}</h3>
            <form id="form-referencia" onsubmit="app.handleReferenciaSubmit(event)" class="space-y-4">
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">EG Semanas</label>
                        <input type="number" name="edad_gestacional_semanas" required class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">EG Días</label>
                        <input type="number" name="edad_gestacional_dias" required class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Motivo de Referencia</label>
                    <textarea name="motivo_referencia" required rows="2" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3"></textarea>
                </div>
                <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 text-primary">Escoger Cita (Tupac Amru)</label>
                    <select name="horario_id" required class="w-full bg-blue-50 border-0 rounded-xl px-4 py-3 font-semibold text-primary">
                        <option value="">Seleccione un horario...</option>
                        ${slotsDisponibles.map(s => {
            const f = new Date(s.fecha).toLocaleDateString();
            const h = new Date(s.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `<option value="${s.id}">${f} - ${h}</option>`;
        }).join('')}
                    </select>
                </div>
                <button type="submit" class="w-full bg-primary hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-primary/25">
                    Confirmar y Enviar al Hospital
                </button>
            </form>
        `;
    },

    async handleReferenciaSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        const refId = "REF-" + Date.now();
        const payloadRef = {
            id: refId,
            numero_correlativo: "COR-" + Math.floor(Math.random() * 9000),
            fecha_registro: new Date().toLocaleDateString(),
            gestante_id: this.currentGestante.id,
            establecimiento_origen_id: String(this.user.establecimiento_id).padStart(9, '0'),
            ...data,
            "estado (ACTIVA/CERRADA)": "ACTIVA"
        };

        // 1. Crear Referencia
        await this.fetchData('referencias', 'create', payloadRef);

        // 2. Programar CITA 1
        // Buscamos el detalle del horario escogido
        const resSlots = await this.fetchData('horario', 'read');
        if (!resSlots.success || !resSlots.data) {
            throw new Error("No se pudo leer la tabla de horarios");
        }
        const slot = resSlots.data.find(s => String(s.id) === String(data.horario_id));
        if (!slot) throw new Error("Horario seleccionado no encontrado");

        const payloadCita = {
            id: "CITA-" + Date.now(),
            referencia_id: refId,
            fecha: slot.fecha,
            hora: slot.hora,
            "tipo (PRIMERA/SEGUNDA)": "PRIMERA",
            "estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)": "PROGRAMADA"
        };
        await this.fetchData('citas', 'create', payloadCita);

        // 3. Ocupar Horario (Cambia a copado)
        await this.fetchData('horario', 'update', { id: data.horario_id, estado: 'copado' });

        Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Referencia y Cita generadas.', confirmButtonColor: '#2563eb' });
        this.renderDashboard();
    },

    renderHospitalDashboard(container) {
        console.log("Iniciando renderHospitalDashboard con TABS");
        container.innerHTML = `
            <div class="mb-10 flex flex-wrap gap-2 p-1.5 bg-slate-100 rounded-2xl w-fit border border-slate-200/50 shadow-inner">
                <button onclick="app.switchTabHosp('hosp-atenciones')" id="tab-hosp-atenciones" class="px-6 py-3 rounded-xl text-sm font-bold transition-all bg-white shadow-md text-primary">Bandeja de Referencias</button>
                <button onclick="app.switchTabHosp('hosp-usuarios')" id="tab-hosp-usuarios" class="px-6 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50">Usuarios</button>
                <button onclick="app.switchTabHosp('hosp-horarios')" id="tab-hosp-horarios" class="px-6 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50">Horarios</button>
                <button onclick="app.switchTabHosp('hosp-especialidades')" id="tab-hosp-especialidades" class="px-6 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50">Especialidades</button>
                <button onclick="app.switchTabHosp('hosp-stats')" id="tab-hosp-stats" class="px-6 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-white/50">Estadísticas</button>
            </div>

            <div id="section-hosp-atenciones" class="hosp-section">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                        <h3 class="text-xl font-extrabold text-slate-800">Referencias Activas</h3>
                        <button onclick="app.loadReferencias()" class="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-primary/20">Refrescar</button>
                    </div>
                    <div class="overflow-x-auto">
                        <table id="table-referencias" class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-slate-400 text-xs font-bold uppercase tracking-widest border-b border-slate-50">
                                    <th class="pb-4 pt-0">Ref #</th>
                                    <th class="pb-4 pt-0">Gestante</th>
                                    <th class="pb-4 pt-0">Cita</th>
                                    <th class="pb-4 pt-0 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="referencias-list" class="text-slate-600 divide-y divide-slate-50"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="section-hosp-usuarios" class="hosp-section hidden">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-slate-800">Gestión de Usuarios</h3>
                        <button onclick="app.crearUsuario()" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold">+ Nuevo Usuario</button>
                    </div>
                    <div class="overflow-x-auto">
                        <table id="table-usuarios" class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-slate-400 text-xs font-bold uppercase border-b border-slate-50">
                                    <th class="pb-4">Nombre</th>
                                    <th class="pb-4">Correo</th>
                                    <th class="pb-4">Establecimiento</th>
                                    <th class="pb-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="hosp-usuarios-list" class="text-slate-600 divide-y divide-slate-50"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="section-hosp-horarios" class="hosp-section hidden">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-slate-800">Gestión de Horarios (Libres)</h3>
                        <button onclick="app.crearHorario()" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold">+ Nuevo Slot</button>
                    </div>
                    <div id="hosp-horarios-list" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"></div>
                </div>
            </div>

            <div id="section-hosp-especialidades" class="hosp-section hidden">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="text-xl font-bold text-slate-800">Catálogo de Especialidades</h3>
                        <button onclick="app.crearEspecialidad()" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold">+ Nueva Especialidad</button>
                    </div>
                    <div class="overflow-x-auto">
                        <table id="table-especialidades" class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-slate-400 text-xs font-bold uppercase border-b border-slate-50">
                                    <th class="pb-4">ID</th>
                                    <th class="pb-4">Nombre de Especialidad</th>
                                    <th class="pb-4 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody id="hosp-especialidades-list" class="text-slate-600 divide-y divide-slate-50"></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div id="section-hosp-stats" class="hosp-section hidden">
                <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                        <h3 class="text-xl font-bold text-slate-800">Resumen de Atenciones</h3>
                        <div class="flex gap-2">
                            <select id="stats-year" class="bg-slate-50 border-0 rounded-lg px-4 py-2 text-sm font-bold text-slate-600"></select>
                            <select id="stats-month" class="bg-slate-50 border-0 rounded-lg px-4 py-2 text-sm font-bold text-slate-600">
                                <option value="all">Todos los meses</option>
                                <option value="1">Enero</option><option value="2">Febrero</option><option value="3">Marzo</option>
                                <option value="4">Abril</option><option value="5">Mayo</option><option value="6">Junio</option>
                                <option value="7">Julio</option><option value="8">Agosto</option><option value="9">Septiembre</option>
                                <option value="10">Octubre</option><option value="11">Noviembre</option><option value="12">Diciembre</option>
                            </select>
                            <button onclick="app.loadStats()" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold">Filtrar</button>
                        </div>
                    </div>
                    <div id="stats-summary" class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"></div>
                    <div class="overflow-x-auto">
                        <table id="table-stats-est" class="w-full text-left border-collapse">
                            <thead>
                                <tr class="text-slate-400 text-xs font-bold uppercase border-b border-slate-50">
                                    <th class="pb-4">Establecimiento</th>
                                    <th class="pb-4 text-center">Primera Cita</th>
                                    <th class="pb-4 text-center">Cerradas (2da)</th>
                                    <th class="pb-4 text-center">Total</th>
                                </tr>
                            </thead>
                            <tbody id="stats-est-list" class="text-slate-600 divide-y divide-slate-50"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        this.loadReferencias();
    },

    switchTabHosp(tabId) {
        document.querySelectorAll('.hosp-section').forEach(s => s.classList.add('hidden'));
        document.getElementById(`section-${tabId}`).classList.remove('hidden');

        const parent = document.getElementById(`tab-${tabId}`).parentElement;
        parent.querySelectorAll('button').forEach(b => {
            b.classList.remove('bg-white', 'shadow-sm', 'text-primary');
            b.classList.add('text-slate-500', 'hover:bg-white/50');
        });
        const active = document.getElementById(`tab-${tabId}`);
        active.classList.add('bg-white', 'shadow-sm', 'text-primary');
        active.classList.remove('text-slate-500', 'hover:bg-white/50');

        if (tabId === 'hosp-usuarios') this.loadHospUsuarios();
        if (tabId === 'hosp-horarios') this.loadHospHorarios();
        if (tabId === 'hosp-especialidades') this.loadHospEspecialidades();
        if (tabId === 'hosp-stats') this.initStats();
    },

    async loadReferencias() {
        Swal.fire({
            title: 'Cargando bandeja...',
            didOpen: () => Swal.showLoading(),
            allowOutsideClick: false,
            showConfirmButton: false,
            timer: 3000 // A bit more for safety
        });

        const resRef = await this.fetchData('referencias', 'read');
        const resGest = await this.fetchData('gestantes', 'read');
        const resCitas = await this.fetchData('citas', 'read');

        Swal.close();

        const list = document.getElementById('referencias-list');
        const activas = (resRef.data || []).filter(r => r['estado (ACTIVA/CERRADA)'] === 'ACTIVA');

        if (this.dataTable) this.dataTable.destroy();

        list.innerHTML = activas.map(ref => {
            const gest = resGest.data.find(g => g.id === ref.gestante_id) || { nombres: 'N/A' };
            const cita = resCitas.data.find(c => c.referencia_id === ref.id && c['estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)'] === 'PROGRAMADA');

            return `
                <tr class="hover:bg-slate-50 transition-colors group">
                    <td class="py-4 font-bold text-slate-800 text-sm">${ref.numero_correlativo}</td>
                    <td class="py-4">
                        <p class="font-semibold text-slate-700">${gest.nombres}</p>
                        <span class="text-[10px] text-slate-400 font-bold">${ref.motivo_referencia}</span>
                    </td>
                    <td class="py-4">
                        ${cita ? `<span class="bg-green-50 text-green-600 px-3 py-1 rounded-full text-[11px] font-bold">📅 ${new Date(cita.fecha).toLocaleDateString()} ${new Date(cita.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>` : '<span class="text-slate-300">Sin cita</span>'}
                    </td>
                    <td class="py-4 text-right">
                        ${cita ? `<button onclick="app.marcarAtencion('${cita.id}', '${ref.id}', '${cita['tipo (PRIMERA/SEGUNDA)']}')" class="bg-primary text-white px-4 py-2 rounded-lg text-xs font-bold shadow-md shadow-primary/10 transition-transform active:scale-95">Atención</button>` : ''}
                    </td>
                </tr>
            `;
        }).join('');

        this.dataTable = $('#table-referencias').DataTable({
            autoWidth: false,
            searching: true,
            language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json' }
        });
    },

    async marcarAtencion(citaId, refId, tipoCita) {
        // Feedback inmediato mientras cargamos datos adicionales
        Swal.fire({ title: 'Preparando atención...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });

        // Cargar horarios y especialidades
        const [resSlots, resEsp] = await Promise.all([
            this.fetchData('horario', 'read'),
            this.fetchData('especialidades', 'read')
        ]);

        const slotsDisponibles = (resSlots.data || []).filter(s => s.estado === 'libre');
        const listaEsp = resEsp.data || [];

        Swal.close();

        const { value: formValues } = await Swal.fire({
            title: `Registrar Atención Clínica (${tipoCita})`,
            width: '600px',
            html: `
                <div class="text-left space-y-4 py-2">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Resultado de Prueba</label>
                            <select id="at-resultado" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10">
                                <option value="REACTIVO">REACTIVO</option>
                                <option value="NO_REACTIVO">NO REACTIVO</option>
                                <option value="PATOLOGICO">PATOLÓGICO</option>
                                <option value="DERIVADO">DERIVADO</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado de Asistencia</label>
                            <select id="at-estado" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10">
                                <option value="ASISTIO">ASISTIÓ (Éxito)</option>
                                <option value="NO_ASISTIO">NO ASISTIÓ (Inasistencia)</option>
                                <option value="REPROGRAMADA">REPROGRAMADA</option>
                            </select>
                        </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4">
                        <div id="acude-container">
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">¿Acude?</label>
                            <select id="at-acude" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10">
                                <option value="TRUE">SÍ (Acude)</option>
                                <option value="FALSE">NO (No acude)</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">¿Teleorientación?</label>
                            <select id="at-tele" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10">
                                <option value="FALSE">NO</option>
                                <option value="TRUE">SÍ</option>
                            </select>
                        </div>
                    </div>

                    <div id="esp-selector-container" class="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 hidden">
                        <label class="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-2">Especialidad de Derivación</label>
                        <select id="at-esp" class="w-full bg-white border-0 rounded-xl px-4 py-3 text-sm font-semibold text-indigo-700 focus:ring-2 focus:ring-indigo-100">
                            <option value="">Seleccione especialidad...</option>
                            ${listaEsp.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('')}
                        </select>
                    </div>

                    <div id="slot-selector-container" class="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 hidden">
                        <label class="block text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Asignar Nueva Cita (Requerido)</label>
                        <select id="at-next-slot" class="w-full bg-white border-0 rounded-xl px-4 py-3 text-sm font-semibold text-primary focus:ring-2 focus:ring-primary/10">
                            <option value="">Seleccione un horario disponible...</option>
                            ${slotsDisponibles.map(s => {
                const f = new Date(s.fecha).toLocaleDateString();
                const h = new Date(s.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                return `<option value="${s.id}">${f} - ${h}</option>`;
            }).join('')}
                        </select>
                    </div>

                    <div>
                        <label class="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Observaciones / Evolución</label>
                        <textarea id="at-obs" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/10" rows="3"></textarea>
                    </div>
                </div>
            `,
            didOpen: () => {
                const resSel = document.getElementById('at-resultado');
                const stateSel = document.getElementById('at-estado');
                const slotCont = document.getElementById('slot-selector-container');
                const espCont = document.getElementById('esp-selector-container');
                const acudeCont = document.getElementById('acude-container');

                const updateVisibility = () => {
                    const state = stateSel.value;
                    const res = resSel.value;

                    // Lógica de Slot
                    const needsNextSlot = (state === 'ASISTIO' && tipoCita === 'PRIMERA') ||
                        (state === 'NO_ASISTIO' || state === 'REPROGRAMADA');
                    slotCont.classList.toggle('hidden', !needsNextSlot);

                    // Lógica de Derivación
                    espCont.classList.toggle('hidden', res !== 'DERIVADO');

                    // Lógica de Acude: si asiste, se oculta el campo acude (se asume TRUE)
                    acudeCont.classList.toggle('hidden', state === 'ASISTIO');
                };

                stateSel.addEventListener('change', updateVisibility);
                resSel.addEventListener('change', updateVisibility);
                updateVisibility();
            },
            confirmButtonText: 'Confirmar y Guardar',
            confirmButtonColor: '#2563eb',
            preConfirm: () => {
                const state = document.getElementById('at-estado').value;
                const res = document.getElementById('at-resultado').value;
                const nextSlotId = document.getElementById('at-next-slot').value;
                const espId = document.getElementById('at-esp').value;

                const needsNext = (state === 'ASISTIO' && tipoCita === 'PRIMERA') ||
                    (state === 'NO_ASISTIO' || state === 'REPROGRAMADA');

                if (needsNext && !nextSlotId) {
                    Swal.showValidationMessage('Debes elegir un horario para la siguiente cita / reprogramación');
                    return false;
                }

                if (res === 'DERIVADO' && !espId) {
                    Swal.showValidationMessage('Debes elegir una especialidad para la derivación');
                    return false;
                }

                return {
                    resultado: res,
                    estado: state,
                    acude: state === 'ASISTIO' ? 'TRUE' : document.getElementById('at-acude').value,
                    teleorientacion: document.getElementById('at-tele').value,
                    obs: document.getElementById('at-obs').value,
                    nextSlotId: nextSlotId,
                    espId: espId
                }
            }
        });

        if (!formValues) return;

        Swal.fire({ title: 'Procesando...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        // 1. Marcar Cita Actual como resuelta
        await this.fetchData('citas', 'update', {
            id: citaId,
            "estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)": formValues.estado
        });

        // 2. Crear Registro de Atención (Solo si asistió)
        const esAsistencia = formValues.estado === 'ASISTIO';
        const esFinal = (tipoCita === 'SEGUNDA' && esAsistencia);
        const atId = "AT-" + Date.now();

        if (esAsistencia) {
            await this.fetchData('atenciones', 'create', {
                id: atId,
                cita_id: citaId,
                "resultado (REACTIVO/NO_REACTIVO/PATOLOGICO/DERIVADO)": formValues.resultado,
                "acude (TRUE/FALSE)": formValues.acude,
                "teleorientacion (TRUE/FALSE)": formValues.teleorientacion,
                observaciones: formValues.obs,
                "cerrada (TRUE/FALSE)": esFinal ? 'TRUE' : 'FALSE'
            });

            // 2.1 Si es DERIVADO, guardar en hoja derivaciones
            if (formValues.resultado === 'DERIVADO') {
                await this.fetchData('derivaciones', 'create', {
                    id: "DER-" + Date.now(),
                    atencion_id: atId,
                    especialidad_id: formValues.espId
                });
            }
        }

        // 3. Manejo de Siguiente Paso (Nueva Cita o Cierre)
        if (esFinal) {
            await this.fetchData('referencias', 'update', {
                id: refId,
                "estado (ACTIVA/CERRADA)": 'CERRADA'
            });
            Swal.fire('Atención Finalizada', 'Referencia marcada como CERRADA tras la 2da atención.', 'success');
        } else if (formValues.nextSlotId) {
            const nextSlot = resSlots.data.find(s => String(s.id) === String(formValues.nextSlotId));
            const newCitaId = "CITA-" + Date.now();

            await this.fetchData('citas', 'create', {
                id: newCitaId,
                referencia_id: refId,
                fecha: nextSlot.fecha,
                hora: nextSlot.hora,
                "tipo (PRIMERA/SEGUNDA)": (formValues.estado === 'ASISTIO') ? 'SEGUNDA' : tipoCita,
                "estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)": 'PROGRAMADA'
            });

            await this.fetchData('horario', 'update', { id: formValues.nextSlotId, estado: 'copado' });
            await Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Su atención fue registrada', confirmButtonColor: '#2563eb' });
        }

        this.loadReferencias();
    },

    // --- GESTIÓN DE USUARIOS ---
    async loadHospUsuarios() {
        const [resUsers, resEst] = await Promise.all([
            this.fetchData('usuarios', 'read'),
            this.fetchData('establecimientos', 'read')
        ]);
        const list = document.getElementById('hosp-usuarios-list');
        list.innerHTML = (resUsers.data || []).map(u => {
            const est = resEst.data?.find(e => String(e.id).trim().padStart(9, '0') === String(u.establecimiento_id).trim().padStart(9, '0'));
            return `
                <tr class="hover:bg-slate-50">
                    <td class="py-4 font-semibold text-sm">${u.nombre_completo}</td>
                    <td class="py-4 text-xs">${u.correo}</td>
                    <td class="py-4 text-xs text-slate-400">${est ? est.nombre : u.establecimiento_id}</td>
                    <td class="py-4 text-right">
                        <button onclick="app.eliminarUsuario('${u.id}')" class="text-red-400 hover:text-red-600 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    async crearUsuario() {
        const resEst = await this.fetchData('establecimientos', 'read');
        const { value: form } = await Swal.fire({
            title: 'Nuevo Usuario',
            html: `
                <input id="u-nom" class="swal2-input" placeholder="Nombre Completo">
                <input id="u-mail" class="swal2-input" placeholder="Correo">
                <input id="u-dni" class="swal2-input" placeholder="DNI">
                <select id="u-est" class="swal2-select">
                    <option value="">Seleccione Establecimiento...</option>
                    ${(resEst.data || []).map(e => `<option value="${String(e.id).trim().padStart(9, '0')}">${e.nombre}</option>`).join('')}
                </select>
            `,
            preConfirm: () => ({
                id: "USU-" + Date.now(),
                nombre_completo: document.getElementById('u-nom').value,
                correo: document.getElementById('u-mail').value,
                dni: document.getElementById('u-dni').value,
                establecimiento_id: document.getElementById('u-est').value
            })
        });

        if (form) {
            await this.fetchData('usuarios', 'create', form);
            this.loadHospUsuarios();
        }
    },

    async eliminarUsuario(id) {
        if ((await Swal.fire({ title: '¿Eliminar usuario?', icon: 'warning', showCancelButton: true })).isConfirmed) {
            await this.fetchData('usuarios', 'delete', { id });
            this.loadHospUsuarios();
        }
    },

    // --- GESTIÓN DE HORARIOS ---
    async loadHospHorarios() {
        const res = await this.fetchData('horario', 'read');
        const list = document.getElementById('hosp-horarios-list');
        const libres = (res.data || []).filter(h => h.estado === 'libre');

        list.innerHTML = libres.map(h => `
            <div class="bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-between items-center group">
                <div>
                    <p class="text-xs font-bold text-slate-800">${new Date(h.fecha).toLocaleDateString()}</p>
                    <p class="text-[10px] text-slate-400 font-bold uppercase">${new Date(h.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <button onclick="app.eliminarHorario('${h.id}')" class="opacity-0 group-hover:opacity-100 text-red-400 transition-opacity"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
            </div>
        `).join('');
    },

    async crearHorario() {
        const { value: form } = await Swal.fire({
            title: 'Nuevo Slot de Horario',
            html: `
                <input id="h-fecha" type="date" class="swal2-input">
                <input id="h-hora" type="time" class="swal2-input">
            `,
            preConfirm: () => ({
                id: "SLOT-" + Date.now(),
                fecha: document.getElementById('h-fecha').value,
                hora: '1899-12-30T' + document.getElementById('h-hora').value + ':00.000Z', // Formato GAS
                estado: 'libre'
            })
        });

        if (form) {
            await this.fetchData('horario', 'create', form);
            this.loadHospHorarios();
        }
    },

    async eliminarHorario(id) {
        await this.fetchData('horario', 'delete', { id });
        this.loadHospHorarios();
    },

    // --- GESTIÓN DE ESPECIALIDADES ---
    async loadHospEspecialidades() {
        Swal.fire({ title: 'Cargando especialidades...', didOpen: () => Swal.showLoading() });
        const res = await this.fetchData('especialidades', 'read');
        Swal.close();

        const list = document.getElementById('hosp-especialidades-list');
        list.innerHTML = (res.data || []).map(e => `
            <tr class="hover:bg-slate-50">
                <td class="py-4 text-xs font-bold text-slate-400">${e.id}</td>
                <td class="py-4 font-semibold text-sm text-slate-700">${e.nombre}</td>
                <td class="py-4 text-right">
                    <button onclick="app.eliminarEspecialidad('${e.id}')" class="text-red-400 hover:text-red-600 p-1"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </td>
            </tr>
        `).join('');
    },

    async crearEspecialidad() {
        const { value: nombre } = await Swal.fire({
            title: 'Nueva Especialidad',
            input: 'text',
            inputLabel: 'Nombre de la Especialidad',
            inputPlaceholder: 'Ej: Ginecología, Obstetricia...',
            showCancelButton: true,
            inputValidator: (value) => {
                if (!value) return '¡Debes ingresar un nombre!';
            }
        });

        if (nombre) {
            Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });
            await this.fetchData('especialidades', 'create', {
                id: "ESP-" + Date.now(),
                nombre: nombre.toUpperCase()
            });
            Swal.fire('Guardado', 'Especialidad creada con éxito.', 'success');
            this.loadHospEspecialidades();
        }
    },

    async eliminarEspecialidad(id) {
        const { isConfirmed } = await Swal.fire({
            title: '¿Eliminar Especialidad?',
            text: "Esta acción podría afectar los registros de derivación existentes.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonColor: '#ef4444'
        });

        if (isConfirmed) {
            Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading() });
            await this.fetchData('especialidades', 'delete', { id });
            Swal.fire('Eliminado', 'Especialidad removida.', 'success');
            this.loadHospEspecialidades();
        }
    },

    // --- DASHBOARD STATS ---
    async initStats() {
        const yrSel = document.getElementById('stats-year');
        const now = new Date();
        yrSel.innerHTML = [0, 1].map(o => `<option value="${now.getFullYear() - o}">${now.getFullYear() - o}</option>`).join('');
        this.loadStats();
    },

    async loadStats() {
        Swal.fire({ title: 'Calculando...', didOpen: () => Swal.showLoading() });
        const yr = document.getElementById('stats-year').value;
        const mo = document.getElementById('stats-month').value;

        const [resAt, resEst, resCitas, resRef] = await Promise.all([
            this.fetchData('atenciones', 'read'),
            this.fetchData('establecimientos', 'read'),
            this.fetchData('citas', 'read'),
            this.fetchData('referencias', 'read')
        ]);
        Swal.close();

        // Cruzar datos
        const allAt = (resAt.data || []).map(at => {
            const cita = resCitas.data?.find(c => c.id === at.cita_id);
            const ref = resRef.data?.find(r => r.id === (cita?.referencia_id));
            const citaDate = cita ? new Date(cita.fecha) : null;
            return {
                ...at,
                tipo: cita?.["tipo (PRIMERA/SEGUNDA)"],
                est_id: ref ? String(ref.establecimiento_origen_id).padStart(9, '0') : null,
                year: citaDate?.getFullYear(),
                month: citaDate?.getMonth() + 1
            };
        });

        // Filtrar
        const filtered = allAt.filter(at => at.year == yr && (mo === 'all' || at.month == mo));

        // Resumen
        const p1 = filtered.filter(at => at.tipo === 'PRIMERA').length;
        const p2 = filtered.filter(at => at.tipo === 'SEGUNDA').length;

        document.getElementById('stats-summary').innerHTML = `
            <div class="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <p class="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Total Primeras Atenciones</p>
                <h4 class="text-3xl font-black text-primary">${p1}</h4>
            </div>
            <div class="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                <p class="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-1">Total Segundas (Cerradas)</p>
                <h4 class="text-3xl font-black text-indigo-700">${p2}</h4>
            </div>
        `;

        // Por establecimiento
        const estStats = (resEst.data || []).map(e => {
            const id = String(e.id).trim().padStart(9, '0');
            const eAt = filtered.filter(at => at.est_id === id);
            return {
                nombre: e.nombre,
                p1: eAt.filter(at => at.tipo === 'PRIMERA').length,
                p2: eAt.filter(at => at.tipo === 'SEGUNDA').length
            };
        }).filter(s => s.p1 > 0 || s.p2 > 0);

        document.getElementById('stats-est-list').innerHTML = estStats.map(s => `
            <tr>
                <td class="py-4 font-semibold text-sm">${s.nombre}</td>
                <td class="py-4 text-center font-bold text-blue-600">${s.p1}</td>
                <td class="py-4 text-center font-bold text-indigo-600">${s.p2}</td>
                <td class="py-4 text-center text-slate-400 text-xs">${s.p1 + s.p2}</td>
            </tr>
        `).join('') || '<tr><td colspan="4" class="py-8 text-center text-slate-400 italic">No hay datos para este periodo</td></tr>';
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
