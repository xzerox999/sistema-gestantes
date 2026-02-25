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
                const estId = String(foundUser.establecimiento_id).trim();
                this.user = {
                    name: foundUser.nombre_completo,
                    email: foundUser.correo,
                    establecimiento_id: estId,
                    role: estId === CONFIG.HOSPITAL_ID ? 'hospital' : 'eess'
                };
                localStorage.setItem('gestantes_user', JSON.stringify(this.user));
                Swal.fire({
                    icon: 'success',
                    title: '¡Bienvenido!',
                    text: this.user.name,
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
        if (nameEl) nameEl.textContent = `${this.user.name} (${this.user.establecimiento_id})`;
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
                return await response.json();
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
        const content = document.getElementById('dashboard-content');
        if (this.user.role === 'hospital') {
            this.renderHospitalDashboard(content);
        } else {
            this.renderEESSDashboard(content);
        }
    },

    renderEESSDashboard(container) {
        container.innerHTML = `
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
        `;
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
            establecimiento_origen_id: this.user.establecimiento_id,
            ...data,
            "estado (ACTIVA/CERRADA)": "ACTIVA"
        };

        // 1. Crear Referencia
        await this.fetchData('referencias', 'create', payloadRef);

        // 2. Programar CITA 1
        // Buscamos el detalle del horario escogido
        const resSlots = await this.fetchData('horario', 'read');
        const slot = resSlots.data.find(s => String(s.id) === String(data.horario_id));

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
        container.innerHTML = `
            <div class="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                <div class="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                    <h3 class="text-xl font-extrabold text-slate-800">Hospital: Bandeja de Referencias Activas</h3>
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
                        <tbody id="referencias-list" class="text-slate-600 divide-y divide-slate-50">
                            <!-- Inyectado -->
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        this.loadReferencias();
    },

    async loadReferencias() {
        const resRef = await this.fetchData('referencias', 'read');
        const resGest = await this.fetchData('gestantes', 'read');
        const resCitas = await this.fetchData('citas', 'read');

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
        const { value: formValues } = await Swal.fire({
            title: 'Registrar Atención',
            html: `
                <div class="text-left py-2">
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-1">Observaciones</label>
                    <textarea id="atencion-obs" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/10" rows="3"></textarea>
                    
                    <label class="block text-xs font-bold text-slate-400 uppercase mt-4 mb-2">Resultado</label>
                    <select id="atencion-resultado" class="w-full bg-slate-50 border-0 rounded-xl px-4 py-3 appearance-none">
                        <option value="ASISTIO">Éxito / Asistió</option>
                        <option value="NO_ASISTIO">Inasistencia</option>
                        <option value="DERIVADO">Derivado a Especialista</option>
                    </select>
                </div>
            `,
            confirmButtonText: 'Guardar Resultado',
            confirmButtonColor: '#2563eb',
            preConfirm: () => {
                return {
                    obs: document.getElementById('atencion-obs').value,
                    resultado: document.getElementById('atencion-resultado').value
                }
            }
        });

        if (!formValues) return;

        Swal.fire({ title: 'Guardando...', didOpen: () => Swal.showLoading() });

        // 1. Marcar Cita Antigua
        await this.fetchData('citas', 'update', {
            id: citaId,
            "estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)": formValues.resultado
        });

        // 2. Lógica según resultado
        if (formValues.resultado === 'ASISTIO') {
            const esFinal = (tipoCita === 'SEGUNDA');
            await this.fetchData('atenciones', 'create', {
                id: "AT-" + Date.now(),
                cita_id: citaId,
                observaciones: formValues.obs,
                cerrada: esFinal ? 'TRUE' : 'FALSE'
            });

            if (esFinal) {
                await this.fetchData('referencias', 'update', {
                    id: refId,
                    "estado (ACTIVA/CERRADA)": 'CERRADA'
                });
                Swal.fire('¡Cerrado!', 'La referencia ha sido finalizada con éxito.', 'success');
            } else {
                // Programar TIPO SEGUNDA si era primera
                await this.fetchData('citas', 'create', {
                    id: "CITA-" + Date.now(),
                    referencia_id: refId,
                    "tipo (PRIMERA/SEGUNDA)": 'SEGUNDA',
                    "estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)": 'PROGRAMADA',
                    fecha: 'Por definir', // Aquí podrías cargar de nuevo horarios si gustas
                    hora: ''
                });
                Swal.fire('Atención 1 Guardada', 'Se ha habilitado espacio para la segunda cita.', 'info');
            }
        } else if (formValues.resultado === 'NO_ASISTIO') {
            // Reprogramar misma cita (TIPO 1 o 2)
            await this.fetchData('citas', 'create', {
                id: "CITA-" + Date.now(),
                referencia_id: refId,
                "tipo (PRIMERA/SEGUNDA)": tipoCita,
                "estado (PROGRAMADA/ASISTIO/NO_ASISTIO/REPROGRAMADA)": 'PROGRAMADA',
                fecha: 'Reprogramada',
                hora: ''
            });
            Swal.fire('Inasistencia', 'Cita marcada como inasistida. Nueva cita pendiente.', 'warning');
        } else if (formValues.resultado === 'DERIVADO') {
            const { value: espId } = await Swal.fire({
                title: 'Especialidad',
                input: 'select',
                inputOptions: { '1': 'Ginecología', '2': 'Cardiología' }, // Mock
                placeholder: 'Seleccione especialidad'
            });
            await this.fetchData('derivaciones', 'create', { atencion_id: "AT-" + Date.now(), especialidad_id: espId });
            Swal.fire('Derivación', 'Paciente derivado correctamente.', 'info');
        }

        this.loadReferencias();
    }
};

window.app = app;
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
