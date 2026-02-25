const CONFIG = {
    API_URL: 'https://script.google.com/macros/s/AKfycbxIoz0dZQ3q9eqOp_i1ZBJshcK80rzHzyghtxRXCGjP_1F1FrVxhBklaSnmvvQedPOH/exec',
};

const app = {
    user: null,

    init() {
        console.log("App iniciada");
        this.checkAuth();
    },

    checkAuth() {
        // En un escenario real, cargaríamos el GIS (Google Identity Services)
        // Por ahora simularemos el estado
        const savedUser = localStorage.getItem('gestantes_user');
        if (savedUser) {
            this.user = JSON.parse(savedUser);
            this.showDashboard();
        } else {
            this.showLogin();
        }
    },

    login() {
        // Simulación de login para desarrollo inicial
        // Aquí se implementará la verificación contra la hoja 'usuarios' de Sheets
        console.log("Iniciando login...");

        // Mocking a successful user after a delay
        setTimeout(() => {
            const mockUser = {
                name: "Hector Monzon",
                email: "hmonzon77@gmail.com",
                role: "hospital" // o 'eess'
            };
            this.user = mockUser;
            localStorage.setItem('gestantes_user', JSON.stringify(mockUser));
            this.showDashboard();
        }, 1000);
    },

    logout() {
        this.user = null;
        localStorage.removeItem('gestantes_user');
        this.showLogin();
    },

    showView(viewId) {
        document.getElementById('login-view').style.display = 'none';
        document.getElementById('dashboard-view').style.display = 'none';

        document.getElementById(viewId).style.display = 'block';
    },

    showLogin() {
        document.getElementById('user-profile').style.display = 'none';
        this.showView('login-view');
    },

    showDashboard() {
        document.getElementById('user-name').textContent = this.user.name;
        document.getElementById('user-profile').style.display = 'flex';
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
                    mode: 'no-cors', // Para evitar problemas de CORS en POST hacia GAS
                    body: JSON.stringify({ action, sheet, payload })
                });
                // Nota: no-cors devuelve un opaco, pero GAS procesa el POST igual
                return { success: true, message: 'Solicitud enviada (proceso asíncrono)' };
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
            <div class="grid">
                <div class="card">
                    <h3>EESS: Registro de Gestante</h3>
                    <p style="margin-bottom: 1.5rem;">Ingresa los datos de la gestante para iniciar el proceso.</p>
                    <form id="form-gestante" onsubmit="app.handleGestanteSubmit(event)">
                        <div class="grid grid-2">
                            <div class="form-group">
                                <label>DNI</label>
                                <input type="text" name="dni" required placeholder="8 dígitos">
                            </div>
                            <div class="form-group">
                                <label>Nombres Completos</label>
                                <input type="text" name="nombres" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Teléfono</label>
                            <input type="text" name="telefono" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                            Siguiente: Crear Referencia
                        </button>
                    </form>
                </div>
                <div class="card" id="referencia-section" style="opacity: 0.5; pointer-events: none;">
                    <h3>Crear Referencia</h3>
                    <p>Completa los datos clínicos de la referencia.</p>
                </div>
            </div>
        `;
    },

    async handleGestanteSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        data.id = "G-" + Date.now(); // Simple ID generator

        console.log("Registrando gestante...", data);
        const res = await this.fetchData('gestantes', 'create', data);

        if (res.success) {
            alert("Gestante registrada correctamente");
            this.currentGestante = data;
            this.unlockReferenciaForm();
        } else {
            alert("Error al registrar: " + res.message);
        }
    },

    unlockReferenciaForm() {
        const section = document.getElementById('referencia-section');
        section.style.opacity = "1";
        section.style.pointer_events = "auto";
        section.innerHTML = `
            <h3>Crear Referencia para ${this.currentGestante.nombres}</h3>
            <form id="form-referencia" onsubmit="app.handleReferenciaSubmit(event)" class="mt-1">
                <div class="grid grid-2">
                    <div class="form-group">
                        <label>Semanas Gestación</label>
                        <input type="number" name="edad_gestacional_semanas" required>
                    </div>
                    <div class="form-group">
                        <label>Días</label>
                        <input type="number" name="edad_gestacional_dias" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Motivo de Referencia</label>
                    <textarea name="motivo_referencia" required rows="3"></textarea>
                </div>
                <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                    Enviar Referencia al Hospital
                </button>
            </form>
        `;
    },

    async handleReferenciaSubmit(event) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        const payload = {
            id: "REF-" + Date.now(),
            numero_correlativo: "C-" + Math.floor(Math.random() * 10000),
            fecha_registro: new Date().toLocaleDateString(),
            gestante_id: this.currentGestante.id,
            establecimiento_origen_id: this.user.establecimiento_id || "E001",
            ...data,
            estado: "ACTIVA"
        };

        const res = await this.fetchData('referencias', 'create', payload);
        if (res.success) {
            alert("Referencia enviada con éxito");
            this.renderDashboard(); // Reset
        }
    },

    renderHospitalDashboard(container) {
        container.innerHTML = `
            <div class="card">
                <h3>Hospital: Bandeja de Referencias</h3>
                <p>Cargando referencias activas...</p>
                <div id="referencias-list" class="mt-1"></div>
            </div>
        `;
        this.loadReferencias();
    },

    async loadReferencias() {
        const res = await this.fetchData('referencias', 'read');
        const list = document.getElementById('referencias-list');

        // Cargar también citas para ver el botón de atención
        const resCitas = await this.fetchData('citas', 'read');
        const citas = resCitas.success ? resCitas.data : [];

        if (res.success && res.data.length > 0) {
            const activas = res.data.filter(r => r.estado === 'ACTIVA');
            list.innerHTML = activas.map(ref => {
                const citaPendiente = citas.find(c => c.referencia_id === ref.id && c.estado === 'PROGRAMADA');

                return `
                    <div class="card mt-1" style="border-left: 4px solid ${citaPendiente ? 'var(--success)' : 'var(--primary)'};">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>Ref: ${ref.numero_correlativo}</strong><br>
                                <small>${ref.motivo_referencia}</small>
                                ${citaPendiente ? `<br><span style="color:var(--success)">📅 Cita: ${citaPendiente.fecha} ${citaPendiente.hora} (${citaPendiente.tipo})</span>` : ''}
                            </div>
                            <div>
                                ${citaPendiente
                        ? `<button class="btn btn-primary" onclick="app.registrarAtencion('${citaPendiente.id}', '${ref.id}', ${citaPendiente.tipo === 'SEGUNDA'})">Registrar Atención</button>`
                        : `<button class="btn btn-primary" onclick="app.abrirCita('${ref.id}')">Agendar Cita</button>`
                    }
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            list.innerHTML = "<p>No hay referencias activas.</p>";
        }
    },

    abrirCita(referenciaId) {
        const content = document.getElementById('dashboard-content');
        content.innerHTML = `
            <div class="card" style="max-width: 500px; margin: 0 auto;">
                <h3>Programar Cita</h3>
                <form id="form-cita" onsubmit="app.handleCitaSubmit(event, '${referenciaId}')">
                    <div class="form-group">
                        <label>Fecha</label>
                        <input type="date" name="fecha" required>
                    </div>
                    <div class="form-group">
                        <label>Hora</label>
                        <input type="time" name="hora" required>
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select name="tipo">
                            <option value="PRIMERA">PRIMERA</option>
                            <option value="SEGUNDA">SEGUNDA</option>
                        </select>
                    </div>
                    <div class="grid grid-2">
                        <button type="button" class="btn btn-secondary" onclick="app.renderDashboard()">Cancelar</button>
                        <button type="submit" class="btn btn-primary">Guardar Cita</button>
                    </div>
                </form>
            </div>
        `;
    },

    async handleCitaSubmit(event, referenciaId) {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());

        const payload = {
            id: "CITA-" + Date.now(),
            referencia_id: referenciaId,
            ...data,
            estado: "PROGRAMADA"
        };

        const res = await this.fetchData('citas', 'create', payload);
        if (res.success) {
            alert("Cita programada correctamente");
            this.renderDashboard();
        }
    },

    // Extensión para registrar la atención física
    async registrarAtencion(citaId, referenciaId, esSegunda = false) {
        const obs = prompt("Ingrese observaciones de la atención:");
        if (obs === null) return;

        const payload = {
            id: "AT-" + Date.now(),
            cita_id: citaId,
            resultado: "ASISTIO",
            observaciones: obs,
            cerrada: esSegunda ? "TRUE" : "FALSE"
        };

        const res = await this.fetchData('atenciones', 'create', payload);
        if (res.success) {
            // Actualizar estado de la cita
            await this.fetchData('citas', 'update', { id: citaId, estado: 'ASISTIO' });

            if (esSegunda) {
                // Cerrar referencia
                await this.fetchData('referencias', 'update', { id: referenciaId, estado: 'CERRADA' });
                alert("Atención registrada y REFERENCIA CERRADA");
            } else {
                alert("Primera atención registrada. Debe agendar la SEGUNDA cita.");
            }
            this.renderDashboard();
        }
    }
};

window.app = app;
app.init();
