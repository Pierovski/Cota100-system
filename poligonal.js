// MOTOR EXCLUSIVO DE: niv-poligonal.html (Nivelación Simultánea / Pata de Gallo)
/* --- PROTECCIÓN DE NAVEGACIÓN (ALERTA DEDO GORDO GLOBAL) --- */
window.addEventListener('beforeunload', function (e) {
    let tbodyIda = document.getElementById('cuerpoIda');
    let hasData = false;
    if (tbodyIda) {
        let inputs = tbodyIda.querySelectorAll('input.in-va, input.in-vd');
        for (let inp of inputs) {
            if (inp.value.trim() !== "") { hasData = true; break; }
        }
    }
    if (hasData) {
        e.preventDefault();
        e.returnValue = 'Tienes datos en la libreta. ¿Seguro que quieres salir y recargar la página?';
    }
});

/* --- FUNCIONES DE PRECISIÓN ENTERA Y CONFIGURACIÓN --- */
let audioCtxPol = null;

function getDecs() {
    return parseInt(globalConfig.decimales) || 3;
}

function toScaledInt(val, decs = getDecs()) {
    if (val === null || val === undefined || val === "") return NaN;
    let num = typeof val === "number" ? val : parseFloat(String(val).replace(',', '.'));
    if (isNaN(num)) return NaN;
    return Math.round(num * Math.pow(10, decs));
}

function fromScaledInt(intVal, decs = getDecs()) {
    if (isNaN(intVal)) return NaN;
    return intVal / Math.pow(10, decs);
}

function vibrar() {
    if (globalConfig.vibracion !== false && navigator.vibrate) {
        try { navigator.vibrate(20); } catch(e) {}
    }
    if (globalConfig.sonido) {
        try {
            if (!audioCtxPol) audioCtxPol = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtxPol.state === 'suspended') audioCtxPol.resume();
            let osc = audioCtxPol.createOscillator();
            let gain = audioCtxPol.createGain();
            osc.connect(gain); gain.connect(audioCtxPol.destination);
            osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtxPol.currentTime);
            gain.gain.setValueAtTime(0.05, audioCtxPol.currentTime);
            osc.start(); osc.stop(audioCtxPol.currentTime + 0.08);
        } catch(e) {}
    }
}

// Bloqueador dinámico según decimales de Ajustes (3 o 4 decimales)
function formatDecimal(input) {
    let decs = getDecs();
    let val = input.value.replace(/,/g, '.');
    val = val.replace(/[^0-9.-]/g, ''); 
    if (val.indexOf('-') > 0) val = val.replace(/-/g, '');
    if ((val.match(/-/g) || []).length > 1) val = '-' + val.replace(/-/g, '');
    let parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    if (parts.length === 2 && parts[1].length > decs) {
        val = parts[0] + '.' + parts[1].substring(0, decs);
    }
    if(input.value !== val) input.value = val;
}

// Autocompletar ceros al quitar el foco respetando precisión global
function completarCeros(input) {
    let decs = getDecs();
    validarLecturaFisica(input);
    let val = input.value.trim();
    if (val === "" || val === "-" || val === ".") return;
    let intVal = toScaledInt(val, decs);
    if (!isNaN(intVal)) {
        input.value = fromScaledInt(intVal, decs).toFixed(decs);
        guardarBD();
    }
}

// Validación Topográfica Dinámica (4.00m o 5.00m según Ajustes)
function validarLecturaFisica(input) {
    if(!input.classList.contains('in-va') && !input.classList.contains('in-vd')) return;
    let limiteMira = parseFloat(globalConfig.alertaMira) || 5.000;
    let val = parseFloat(input.value);
    if (!isNaN(val) && (val > limiteMira || val < 0)) {
        input.classList.add('input-error');
        showToast(val < 0 ? "Lectura negativa detectada." : `Lectura mayor a ${limiteMira.toFixed(2)}m. Verifica tu mira.`, "error");
    } else {
        input.classList.remove('input-error');
    }
}

/* --- SISTEMA DE UI: TOAST Y MODALS PERSONALIZADOS --- */
function showToast(message, type = "default") {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('fade-out'); toast.addEventListener('animationend', () => toast.remove()); }, 3000);
}

let confirmOkCallback = null;
let confirmCancelCallback = null;
let promptOkCallback = null;

function showCustomAlert(message, title = "INFORMACIÓN") {
    let titleEl = document.getElementById('customAlertTitle');
    if(titleEl) titleEl.innerHTML = `ℹ️ ${title}`;
    document.getElementById('customAlertMsg').innerHTML = message;
    document.getElementById('customAlertOverlay').style.display = 'block';
    setTimeout(() => { 
        document.getElementById('customAlertOverlay').classList.add('activo'); 
        document.getElementById('customAlertModal').classList.add('abierto'); 
    }, 10);
}

function cerrarCustomAlert() {
    document.getElementById('customAlertOverlay').classList.remove('activo'); 
    document.getElementById('customAlertModal').classList.remove('abierto');
    setTimeout(() => { document.getElementById('customAlertOverlay').style.display = 'none'; }, 300);
}

function mostrarLeyenda() {
    let html = `
        <div style="display:flex; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
            <span style="font-size:1.2rem; margin-right:10px;">🔄</span> 
            <div><strong style="color:var(--primary-color);">Independencia:</strong> En Pata de Gallo, ambas líneas avanzan. Las lecturas de L1 y L2 son independientes; solo se sincroniza el nombre de la estación.</div>
        </div>
        <div style="display:flex; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
            <span style="font-size:1.2rem; margin-right:10px;">📏</span> 
            <div><strong style="color:var(--primary-color);">Distancia del Circuito:</strong> Ingresa la longitud horizontal real del recorrido para evaluar la tolerancia $T = m\\sqrt{K}$ sin inflar el margen permisible.</div>
        </div>
        <div style="display:flex; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
            <span style="font-size:1.2rem; margin-right:10px;">⚠️</span> 
            <div><strong style="color:var(--primary-color);">HUD Δ PC:</strong> El error milimétrico por armada compara el desnivel entre miras al llegar (V.AD) y al salir (V.AT) del mismo PC. Si el alarife mueve la placa, saltará en rojo.</div>
        </div>
        <div style="display:flex; align-items:flex-start;">
            <span style="font-size:1.2rem; margin-right:10px;">📊</span> 
            <div><strong style="color:var(--primary-color);">Exportación y BMs:</strong> Guarda los BMs compensados directo en la DB o exporta a Excel (Líneas Gemelas o Ida y Vuelta continua con simulación realista de trípode).</div>
        </div>
    `;
    showCustomAlert(html, "GUÍA DE FUNCIONES");
}

function showCustomConfirm(message, onOk, onCancel = null, okText = "ACEPTAR", cancelText = "CANCELAR") {
    document.getElementById('customConfirmMsg').innerHTML = message.replace(/\n/g, '<br>');
    document.getElementById('btnConfirmOk').innerText = okText;
    document.getElementById('btnConfirmCancel').innerText = cancelText;
    confirmOkCallback = onOk; confirmCancelCallback = onCancel;
    
    document.getElementById('customConfirmOverlay').style.display = 'flex'; 
    setTimeout(() => { 
        document.getElementById('customConfirmOverlay').classList.add('activo'); 
    }, 10);
}

function cerrarCustomConfirm() {
    document.getElementById('customConfirmOverlay').classList.remove('activo');
    setTimeout(() => { document.getElementById('customConfirmOverlay').style.display = 'none'; }, 300);
}

function btnConfirmOkClick() { cerrarCustomConfirm(); if (confirmOkCallback) confirmOkCallback(); }
function btnConfirmCancelClick() { cerrarCustomConfirm(); if (confirmCancelCallback) confirmCancelCallback(); }

function showCustomPrompt(title, defaultVal, onOk) {
    document.getElementById('customPromptTitle').innerText = title;
    let inp = document.getElementById('customPromptInput');
    inp.value = defaultVal; 
    promptOkCallback = onOk;
    document.getElementById('customPromptOverlay').style.display = 'block';
    
    setTimeout(() => { 
        document.getElementById('customPromptOverlay').classList.add('activo'); 
        document.getElementById('customPromptModal').classList.add('abierto'); 
        inp.focus(); 
        inp.setSelectionRange(inp.value.length, inp.value.length);
    }, 10);
}

function cerrarCustomPrompt() {
    document.getElementById('customPromptOverlay').classList.remove('activo'); 
    document.getElementById('customPromptModal').classList.remove('abierto');
    setTimeout(() => { document.getElementById('customPromptOverlay').style.display = 'none'; }, 300);
}

function btnPromptOkClick() {
    let val = document.getElementById('customPromptInput').value;
    cerrarCustomPrompt(); if (promptOkCallback) promptOkCallback(val);
}

/* --- MODAL PRUEBA DE 2 ESTACAS (COLIMACIÓN) --- */
function abrirPruebaDosEstacas() {
    document.getElementById('peA1').value = '';
    document.getElementById('peB1').value = '';
    document.getElementById('peA2').value = '';
    document.getElementById('peB2').value = '';
    document.getElementById('resPrueba').innerHTML = 'Error: ---';
    document.getElementById('overlayPrueba').style.display = 'block';
    setTimeout(() => { 
        document.getElementById('overlayPrueba').classList.add('activo'); 
        document.getElementById('modalPrueba').classList.add('abierto'); 
    }, 10);
}

function cerrarPrueba() {
    document.getElementById('overlayPrueba').classList.remove('activo'); 
    document.getElementById('modalPrueba').classList.remove('abierto');
    setTimeout(() => { document.getElementById('overlayPrueba').style.display = 'none'; }, 300);
}

function calcPrueba() {
    let decs = getDecs();
    let a1Int = toScaledInt(document.getElementById('peA1').value, 4);
    let b1Int = toScaledInt(document.getElementById('peB1').value, 4);
    let a2Int = toScaledInt(document.getElementById('peA2').value, 4);
    let b2Int = toScaledInt(document.getElementById('peB2').value, 4);
    
    let resDiv = document.getElementById('resPrueba');
    if(!isNaN(a1Int) && !isNaN(b1Int) && !isNaN(a2Int) && !isNaN(b2Int)) {
        // Estación 1 al centro (libre de colimación): ΔH verdadero = A1 - B1
        let deltaRealInt = a1Int - b1Int; 
        let a2SinErrorInt = b2Int + deltaRealInt; 
        let errorInt = a2Int - a2SinErrorInt;
        let errorMM = fromScaledInt(errorInt, 4) * 1000;
        let a2Corregido = fromScaledInt(a2SinErrorInt, 4);
        
        let color = Math.abs(errorMM) <= 3.0 ? 'var(--success-text)' : 'var(--danger-color)';
        let signo = errorMM > 0 ? '+' : '';
        let estadoCal = Math.abs(errorMM) <= 3.0
            ? '✓ Nivel Calibrado (OK)'
            : `🔧 Ajustar retículo en mira lejana (A2) a: <strong>${a2Corregido.toFixed(decs)} m</strong>`;
        resDiv.innerHTML = `<span style="font-size:0.8rem; display:block; color:var(--text-color);">Error en visual larga (e):</span>
            <span style="color:${color}; font-size:1.8rem; letter-spacing:1px;">${signo}${errorMM.toFixed(1)} mm</span>
            <div style="font-size:0.85rem; margin-top:6px; padding:6px; border-radius:6px; background:rgba(128,128,128,0.08); color:var(--text-color);">${estadoCal}</div>`;
    } else {
        resDiv.innerHTML = 'Error: ---';
    }
}

function mostrarOpcionesExportacion() {
    let html = `
        <button class="btn-opcion" onclick="exportarExcelPlantilla('lineas')">
            <span style="width:100%; text-align:center;">📊 EXCEL: LÍNEAS 1 Y 2 (Real)</span>
        </button>
        <button class="btn-opcion" style="margin-top:10px;" onclick="exportarExcelPlantilla('ida_vuelta')">
            <span style="width:100%; text-align:center;">🎭 EXCEL: IDA Y VUELTA (Camuflado)</span>
        </button>
        <button class="btn-opcion" style="margin-top:10px; border-color:#1976d2; background:rgba(25,118,210,0.08); color:#1976d2;" onclick="guardarCompensadasEnDB()">
            <span style="width:100%; text-align:center; color:inherit;">💾 GUARDAR BMs COMPENSADOS EN DB</span>
        </button>
        <button class="btn-opcion" style="margin-top:10px; border-color:var(--excel-color); background:rgba(27,94,32,0.05); color:var(--excel-color);" onclick="exportarCSVparaCivil3D()">
            <span style="width:100%; text-align:center; color:inherit;">🗺️ CSV: PUNTOS PARA CIVIL 3D</span>
        </button>
    `;
    document.getElementById('modalSelectTitle').innerText = "OPCIONES DE EXPORTACIÓN";
    document.getElementById('modalSelectContent').innerHTML = html;
    document.getElementById('modalSelectExtra').innerHTML = "";
    document.getElementById('overlaySelect').style.display = 'block';
    setTimeout(() => { 
        document.getElementById('overlaySelect').classList.add('activo'); 
        document.getElementById('modalSelect').classList.add('abierto'); 
    }, 10);
}

// Inyecta directamente las cotas compensadas del circuito en la Base de Datos de BMs del proyecto
function guardarCompensadasEnDB() {
    cerrarModalSelect();
    let compRows = document.querySelectorAll('#cuerpoCompensadas tr');
    if (compRows.length === 0) return showToast("Primero genera las cotas compensadas.", "warning");

    let p = obtenerProyectoActivo();
    if (!p) return;
    let decs = getDecs();
    let nuevos = 0;
    let actualizados = 0;

    compRows.forEach((tr, idx) => {
        let tds = tr.querySelectorAll('td');
        let nombreBM = tds[0].innerText.trim().toUpperCase();
        let cotaCompInt = toScaledInt(tds[4].innerText, decs);
        if (!nombreBM || isNaN(cotaCompInt)) return;
        let cotaComp = fromScaledInt(cotaCompInt, decs);

        let existenteIdx = p.bms.findIndex(b => b.nombre === nombreBM);
        if (existenteIdx > -1) {
            if (idx > 0) {
                p.bms[existenteIdx].cota = cotaComp;
                if (!p.bms[existenteIdx].obs) p.bms[existenteIdx].obs = "Compensado en Circuito";
                actualizados++;
            }
        } else {
            p.bms.push({ nombre: nombreBM, cota: cotaComp, obs: "BM Compensado en Circuito" });
            nuevos++;
        }
    });

    guardarBD();
    renderBMs();
    showToast(`✅ ${nuevos} BMs creados y ${actualizados} actualizados en la DB`, "success");
}

// Alias compatible con el botón directo de niv-poligonal.html
function guardarBMsCompensadosEnDB() {
    guardarCompensadasEnDB();
}

/* --- UI: MODAL SELECTOR GENÉRICO --- */
let tipoModalActual = "";

function abrirModalSelect(tipo) {
    tipoModalActual = tipo;
    const titulo = document.getElementById('modalSelectTitle');
    const contenido = document.getElementById('modalSelectContent');
    const extra = document.getElementById('modalSelectExtra');
    contenido.innerHTML = ""; extra.innerHTML = "";
    
    let p = obtenerProyectoActivo();
    let decs = getDecs();

    if(tipo === 'proyecto') {
        titulo.innerText = "📁 SELECCIONAR PROYECTO";
        appData.proyectos.forEach(proj => {
            let isActivo = proj.id === appData.activoId;
            contenido.innerHTML += `<button class="btn-opcion" style="${isActivo ? 'background:var(--primary-color); color:#fff;' : ''}" onclick="seleccionarOpcionModal('${proj.id}', '${proj.nombre}')"><span>${proj.nombre}</span></button>`;
        });
    } else if(tipo === 'orden') {
        titulo.innerText = "⚙️ ORDEN DE NIVELACIÓN";
        let opciones = [
            {val: "0.004", txt: "Orden I (4mm √K)"},
            {val: "0.008", txt: "Orden II (8mm √K)"},
            {val: "0.012", txt: "Orden III (12mm √K)"},
            {val: "0.020", txt: "Orden IV (20mm √K)"}
        ];
        let actual = document.getElementById('ordenNiv').value;
        opciones.forEach(opt => {
            let isActivo = opt.val === actual;
            contenido.innerHTML += `<button class="btn-opcion" style="${isActivo ? 'background:var(--primary-color); color:#fff;' : ''}" onclick="seleccionarOpcionModal('${opt.val}', '${opt.txt}')"><span>${opt.txt}</span></button>`;
        });
    } else if(tipo === 'bm-tabla') {
        titulo.innerText = "📍 SELECCIONAR PTO BASE";
        p.bms.forEach(bm => {
            contenido.innerHTML += `<button class="btn-opcion" onclick="seleccionarOpcionModal('${bm.nombre}', '')">
                <span>${bm.nombre}</span>
                <span class="cota">Cota: ${bm.cota.toFixed(decs)}</span>
            </button>`;
        });
        extra.innerHTML = `<button class="btn-accion" style="background:var(--table-header); color:#fff; font-size:1.1rem; padding:15px; margin-top:10px;" onclick="activarTecladoManual()">⌨️ TECLADO MANUAL</button>`;
    } else if(tipo === 'importar-bm') {
        titulo.innerText = "🔗 PUENTE DE BMs";
        bmsExternosPolCache = recopilarBMsExternosPol();
        if (bmsExternosPolCache.length === 0) {
            contenido.innerHTML = `<div style="padding:15px; text-align:center; font-weight:700; opacity:0.7;">No se encontraron BMs nuevos en otros módulos o proyectos.</div>`;
        } else {
            contenido.innerHTML += `<button class="btn-accion" style="background:var(--primary-color); margin-bottom:10px; padding:10px; font-size:0.9rem;" onclick="importarTodosBMsExternosPol()">📥 IMPORTAR TODOS (${bmsExternosPolCache.length})</button>`;
            bmsExternosPolCache.forEach((bm, idx) => {
                contenido.innerHTML += `<button class="btn-opcion" onclick="importarBMExternoPol(${idx})">
                    <div><strong>${bm.nombre}</strong><br><span style="font-size:0.75rem; color:#888;">${bm.origen}</span></div>
                    <span class="cota">${Number(bm.cota).toFixed(decs)} m</span>
                </button>`;
            });
        }
    }

    document.getElementById('overlaySelect').style.display = 'block';
    setTimeout(() => { document.getElementById('overlaySelect').classList.add('activo'); document.getElementById('modalSelect').classList.add('abierto'); }, 10);
}

function cerrarModalSelect() {
    document.getElementById('overlaySelect').classList.remove('activo');
    document.getElementById('modalSelect').classList.remove('abierto');
    setTimeout(() => { document.getElementById('overlaySelect').style.display = 'none'; }, 300);
}

function seleccionarOpcionModal(valor, textoExtra) {
    cerrarModalSelect();
    if(tipoModalActual === 'proyecto') {
        cambiarProyectoActivo(valor);
    } else if(tipoModalActual === 'orden') {
        document.getElementById('ordenNiv').value = valor;
        document.getElementById('txtSelectOrden').innerText = textoExtra;
        actualizarOrdenTxt(); guardarBD(); procesarDobleLiga();
    } else if(tipoModalActual === 'bm-tabla') {
        if(inputPtoActivo) {
            inputPtoActivo.value = valor; verificarBM(inputPtoActivo); syncBM(inputPtoActivo); guardarBD();
        }
    }
}

/* --- SISTEMA PRINCIPAL --- */
let appData = { activoId: 1, proyectos: [], contadorProyectos: 1 };
let globalConfig = { darkMode: false, vibracion: false, decimales: "3", wakeLockEnabled: false };
let inputPtoActivo = null; 
let tablaBloqueada = false;
let wakeLock = null;
let editandoBMIndex = -1;

async function solicitarWakeLock() { if ('wakeLock' in navigator) { try { wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {} } }

function toggleBloqueoTabla(forceLock = false) {
    if (forceLock) {
        tablaBloqueada = true;
    } else {
        tablaBloqueada = !tablaBloqueada;
    }
    
    const btn = document.getElementById('btnBloquear');
    const tabla = document.getElementById('contenedorTablas');
    const btnAdd = document.getElementById('btnAddFila');
    const btnDel = document.getElementById('btnDelFila');
    const btnReset = document.getElementById('btnResetTabla');

    if (tablaBloqueada) {
        btn.innerHTML = "🔓 Desbloq."; btn.style.color = "var(--danger-color)"; btn.style.borderColor = "var(--danger-color)";
        tabla.classList.add('modo-bloqueado');
        if(btnAdd) { btnAdd.style.opacity = "0.4"; btnAdd.style.pointerEvents = "none"; }
        if(btnDel) { btnDel.style.opacity = "0.4"; btnDel.style.pointerEvents = "none"; }
        if(btnReset) { btnReset.style.opacity = "0.4"; btnReset.style.pointerEvents = "none"; }
    } else {
        btn.innerHTML = "🔒 Bloq."; btn.style.color = "#f57f17"; btn.style.borderColor = "#fbc02d";
        tabla.classList.remove('modo-bloqueado');
        if(btnAdd) { btnAdd.style.opacity = "1"; btnAdd.style.pointerEvents = "auto"; }
        if(btnDel) { btnDel.style.opacity = "1"; btnDel.style.pointerEvents = "auto"; }
        if(btnReset) { btnReset.style.opacity = "1"; btnReset.style.pointerEvents = "auto"; }
        if(!forceLock) showToast("Tablas desbloqueadas", "success");
    }
}

function inicializarApp() {
    localStorage.setItem('cota100_last_name', 'NIVELACIÓN SIMULTÁNEA');
    localStorage.setItem('cota100_last_url', 'niv-poligonal.html');

    try {
        let conf = JSON.parse(localStorage.getItem('cota100_ajustes'));
        if(conf) {
            globalConfig = conf;
            if(globalConfig.darkMode) document.body.classList.add('dark-mode');
            if(globalConfig.wakeLockEnabled) solicitarWakeLock();
        }
    } catch(e) {}

    let stored = localStorage.getItem('cota100_db_poligonal_v11');
    if (stored) { 
        appData = JSON.parse(stored); 
        if(!appData.contadorProyectos) appData.contadorProyectos = appData.proyectos.length;
    } else { 
        appData.contadorProyectos = 1;
        let prefijo = JSON.parse(localStorage.getItem('cota100_ajustes'))?.proyecto || "POLIGONAL";
        appData.proyectos.push({ id: 1, nombre: `${prefijo} 1`, bms: [], tablaIda: [], tablaVuelta: [], params: { cotaBM: "", orden: "0.020", dist: "", tol: "2", cotaLlegada: "" } }); 
        appData.activoId = 1; 
    }
    renderSelectProyectos(); cargarProyectoActivo();
    initTouchDragBM();
}

function obtenerProyectoActivo() { return appData.proyectos.find(p => p.id === appData.activoId); }

function guardarBD() { 
    let p = obtenerProyectoActivo(); if(!p) return;
    p.params.cotaBM = document.getElementById('cotaBM').value; p.params.orden = document.getElementById('ordenNiv').value;
    p.params.dist = document.getElementById('distanciaM').value; p.params.tol = document.getElementById('tolTramo').value;
    p.params.cotaLlegada = document.getElementById('cotaLlegada').value;

    p.tablaIda = []; p.tablaVuelta = [];
    let filasIda = document.querySelectorAll('#cuerpoIda tr'); let filasVuelta = document.querySelectorAll('#cuerpoVuelta tr');

    for (let i = 0; i < filasIda.length; i++) {
        p.tablaIda.push({
            pto: filasIda[i].querySelector('.in-pto').value, bmAsignado: i === 0 ? (filasIda[i].querySelector('.in-pto').dataset.bmAsignado || "") : "",
            va: filasIda[i].querySelector('.in-va').value, vd: filasIda[i].querySelector('.in-vd').value
        });
        p.tablaVuelta.push({
            pto: filasVuelta[i].querySelector('.in-pto').value, va: filasVuelta[i].querySelector('.in-va').value, vd: filasVuelta[i].querySelector('.in-vd').value
        });
    }
    localStorage.setItem('cota100_db_poligonal_v11', JSON.stringify(appData)); 
}

function renderSelectProyectos() {
    let p = obtenerProyectoActivo();
    document.getElementById('txtSelectProyecto').innerText = p ? p.nombre : "Sin Nombre";
}

function crearNuevoProyecto() {
    appData.contadorProyectos = (appData.contadorProyectos || appData.proyectos.length) + 1;
    let prefijo = JSON.parse(localStorage.getItem('cota100_ajustes'))?.proyecto || "POLIGONAL";
    let nombre = `${prefijo} ${appData.contadorProyectos}`;
    let nuevoId = Date.now();
    appData.proyectos.push({ id: nuevoId, nombre: nombre, bms: [], tablaIda: [], tablaVuelta: [], params: { cotaBM: "", orden: "0.020", dist: "", tol: "2", cotaLlegada: "" } });
    appData.activoId = nuevoId; 
    guardarBD(); renderSelectProyectos(); cargarProyectoActivo();
    showToast("Proyecto creado", "success");
}

function eliminarProyecto() {
    if(appData.proyectos.length === 1) return showToast("Crea otro proyecto antes de borrar el último.", "warning");
    let p = obtenerProyectoActivo();
    showCustomConfirm(`⚠️ ¿Borrar "${p.nombre}" permanentemente?`, () => {
        appData.proyectos = appData.proyectos.filter(proj => proj.id !== p.id);
        appData.activoId = appData.proyectos[0].id; 
        guardarBD(); renderSelectProyectos(); cargarProyectoActivo();
        showToast("Proyecto eliminado", "success");
    });
}

function cambiarProyectoActivo(idStr) { appData.activoId = parseInt(idStr); guardarBD(); renderSelectProyectos(); cargarProyectoActivo(); }

function editarNombreProyecto() { 
    let p = obtenerProyectoActivo();
    showCustomPrompt("EDITAR NOMBRE DE LA POLIGONAL", p.nombre, (newName) => {
        if(newName && newName.trim() !== "") {
            p.nombre = newName.trim().toUpperCase();
            guardarBD(); renderSelectProyectos(); 
            showToast("Nombre actualizado", "success");
        }
    });
}

function cargarProyectoActivo() {
    let p = obtenerProyectoActivo();
    document.getElementById('cotaBM').value = p.params.cotaBM || "";
    document.getElementById('cotaLlegada').value = p.params.cotaLlegada || "";
    document.getElementById('ordenNiv').value = p.params.orden;
    
    let ordenTxt = "Orden IV (20mm √K)";
    if(p.params.orden === "0.004") ordenTxt = "Orden I (4mm √K)";
    if(p.params.orden === "0.008") ordenTxt = "Orden II (8mm √K)";
    if(p.params.orden === "0.012") ordenTxt = "Orden III (12mm √K)";
    document.getElementById('txtSelectOrden').innerText = ordenTxt;

    document.getElementById('distanciaM').value = p.params.dist; document.getElementById('tolTramo').value = p.params.tol;
    actualizarOrdenTxt(); renderBMs(); 
    
    const tbodyIda = document.getElementById('cuerpoIda'); const tbodyVuelta = document.getElementById('cuerpoVuelta');
    tbodyIda.innerHTML = ""; tbodyVuelta.innerHTML = "";

    if (!p.tablaIda || p.tablaIda.length === 0) {
        for(let i = 0; i < 8; i++) agregarFila(true);
        guardarBD();
    } else {
        for(let i=0; i<p.tablaIda.length; i++) {
            agregarFila(true); 
            let trIda = tbodyIda.children[i]; let trVuelta = tbodyVuelta.children[i];
            
            trIda.querySelector('.in-pto').value = p.tablaIda[i].pto;
            if(i === 0) trIda.querySelector('.in-pto').dataset.bmAsignado = p.tablaIda[i].bmAsignado;
            
            trIda.querySelector('.in-va').value = p.tablaIda[i].va; trIda.querySelector('.in-vd').value = p.tablaIda[i].vd;
            trVuelta.querySelector('.in-pto').value = p.tablaVuelta[i].pto; trVuelta.querySelector('.in-va').value = p.tablaVuelta[i].va; trVuelta.querySelector('.in-vd').value = p.tablaVuelta[i].vd;
        }
        procesarDobleLiga();
    }
}

function exportarBackupPoligonal() {
    const backup = JSON.parse(localStorage.getItem('cota100_db_poligonal_v11'));
    if(!backup || backup.proyectos.length === 0) return showToast("No hay datos para exportar.", "warning");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup));
    const downloadAnchorNode = document.createElement('a'); const fecha = new Date().toISOString().split('T')[0];
    downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", `DB_Poligonal_${fecha}.json`);
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
    showToast("Backup exportado con éxito", "success");
}

function importarBackupPoligonal() {
    const fileInput = document.getElementById('importPoligFile'); if (fileInput.files.length === 0) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            if(backup && backup.proyectos) {
                localStorage.setItem('cota100_db_poligonal_v11', JSON.stringify(backup));
                showToast("✅ Base de datos restaurada. Recargando...", "success"); setTimeout(() => window.location.reload(), 1500);
            } else showToast("❌ Archivo no válido para esta versión.", "error");
        } catch(err) { showToast("❌ Error al leer el archivo.", "error"); }
    };
    reader.readAsText(fileInput.files[0]);
}

function togglePanel(id) { const p = document.getElementById(id); p.style.display = p.style.display === "none" ? "block" : "none"; }

/* --- DRAG AND DROP BMs --- */
let draggingItemBM = null; let dragTimer = null;
function initTouchDragBM() {
    const list = document.getElementById('listaBMs');
    list.addEventListener('touchstart', e => {
        let item = e.target.closest('.bm-item');
        if(item && !e.target.closest('button')) {
            dragTimer = setTimeout(() => {
                draggingItemBM = item; draggingItemBM.style.opacity = '0.5'; draggingItemBM.style.transform = 'scale(0.95)'; draggingItemBM.style.boxShadow = '0 5px 15px rgba(0,0,0,0.3)';
            }, 400); 
        }
    }, {passive: true});

    list.addEventListener('touchmove', e => {
        if(!draggingItemBM) { clearTimeout(dragTimer); return; }
        e.preventDefault(); const touch = e.touches[0]; const target = document.elementFromPoint(touch.clientX, touch.clientY)?.closest('.bm-item');
        if(target && target !== draggingItemBM) {
            let rect = target.getBoundingClientRect(); let next = (touch.clientY - rect.top) / (rect.bottom - rect.top) > 0.5;
            list.insertBefore(draggingItemBM, next && target.nextSibling || target);
        }
    }, {passive: false});

    list.addEventListener('touchend', e => {
        clearTimeout(dragTimer);
        if(!draggingItemBM) return;
        draggingItemBM.style.opacity = '1'; draggingItemBM.style.transform = 'scale(1)'; draggingItemBM.style.boxShadow = 'none'; draggingItemBM = null;
        guardarOrdenBMs();
    });
}

function guardarOrdenBMs() {
    let p = obtenerProyectoActivo(); let nuevosBMs = [];
    document.querySelectorAll('#listaBMs .bm-item').forEach(item => {
        let nombre = item.querySelector('.bm-info strong').innerText; let bmData = p.bms.find(b => b.nombre === nombre);
        if(bmData) nuevosBMs.push(bmData);
    });
    p.bms = nuevosBMs; guardarBD();
}

function clickEnBM(div, event) {
    if(draggingItemBM) return;
    if(!event.target.closest('button')) {
        let obsDiv = div.closest('.bm-item').querySelector('.bm-obs');
        if(obsDiv) obsDiv.style.display = obsDiv.style.display === "none" ? "block" : "none";
    }
}

function addBM() {
    const name = document.getElementById('newBMName').value.toUpperCase().trim();
    const cotaInput = document.getElementById('newBMCota').value.replace(',', '.');
    const cota = parseFloat(cotaInput); const obs = document.getElementById('newBMObs').value.trim();

    if(!name || isNaN(cota)) return showToast("Datos de nombre y cota inválidos.", "error");
    let decs = getDecs();
    let cotaExacta = fromScaledInt(toScaledInt(cota, decs), decs);
    let p = obtenerProyectoActivo();
    
    const finalizarGuardado = () => {
        document.getElementById('newBMName').value = ""; document.getElementById('newBMCota').value = ""; document.getElementById('newBMObs').value = "";
        guardarBD(); renderBMs(); showToast("BM guardado", "success");
    };

    if(editandoBMIndex > -1) {
        showCustomConfirm("⚠️ ¿Actualizar los datos de este BM?", () => {
            let oldName = p.bms[editandoBMIndex].nombre;
            if(p.bms.some((bm, i) => bm.nombre === name && i !== editandoBMIndex)) return showToast("⚠️ Ya existe otro BM con ese nombre.", "warning");
            p.bms[editandoBMIndex] = { nombre: name, cota: cotaExacta, obs: obs };

            let trIda0 = document.getElementById('cuerpoIda').children[0];
            if (trIda0) {
                let inPto = trIda0.querySelector('.in-pto');
                if (inPto.dataset.bmAsignado === oldName || inPto.value.trim().toUpperCase() === oldName) {
                    inPto.dataset.bmAsignado = name; inPto.value = name;
                    syncBM(inPto);
                    document.getElementById('cotaBM').value = cotaExacta.toFixed(decs);
                }
            }
            editandoBMIndex = -1; let btn = document.getElementById('btnGuardarBM'); btn.innerText = "Guardar BM"; btn.style.background = "var(--table-header)";
            procesarDobleLiga(); guardarBD(); finalizarGuardado();
        });
    } else {
        if(p.bms.some(bm => bm.nombre === name)) return showToast("Ya existe un BM con ese nombre.", "warning");
        p.bms.push({ nombre: name, cota: cotaExacta, obs: obs }); finalizarGuardado();
    }
}

function cargarEditBM(i) {
    let p = obtenerProyectoActivo(); let bm = p.bms[i];
    document.getElementById('newBMName').value = bm.nombre; document.getElementById('newBMCota').value = bm.cota; document.getElementById('newBMObs').value = bm.obs || "";
    editandoBMIndex = i; let btn = document.getElementById('btnGuardarBM'); btn.innerText = "Actualizar BM"; btn.style.background = "var(--primary-color)";
}

function deleteBM(i) { 
    let p = obtenerProyectoActivo();
    showCustomConfirm(`⚠️ ¿Eliminar BM "${p.bms[i].nombre}"?`, () => { p.bms.splice(i, 1); guardarBD(); renderBMs(); procesarDobleLiga(); showToast("BM eliminado", "success"); });
}

function renderBMs() {
    let decs = getDecs(); let p = obtenerProyectoActivo(); const list = document.getElementById('listaBMs'); list.innerHTML = ""; 
    p.bms.forEach((bm, i) => { 
        list.innerHTML += `
        <div class="bm-item" onclick="clickEnBM(this, event)">
            <div class="bm-item-header">
                <div class="bm-info"><strong>${bm.nombre}</strong><span>Elev: ${bm.cota.toFixed(decs)} m</span></div>
                <div class="bm-actions" onclick="event.stopPropagation()">
                    <button onclick="cargarEditBM(${i})">✏️</button>
                    <button style="color:var(--danger-color);" onclick="deleteBM(${i})">🗑️</button>
                </div>
            </div>
            <div class="bm-obs" style="width:100%;">${bm.obs || 'Sin observaciones'}</div>
        </div>`;
    });
}

function abrirSelectorBM(input) {
    let p = obtenerProyectoActivo(); inputPtoActivo = input;
    let tr = input.closest('tr'); let tbodyIda = document.getElementById('cuerpoIda');
    if (tr.parentNode !== tbodyIda || Array.from(tbodyIda.children).indexOf(tr) !== 0) return; 
    if (p.bms.length === 0) { activarTecladoManual(); return; }
    abrirModalSelect('bm-tabla');
}

function activarTecladoManual() {
    cerrarModalSelect();
    if(inputPtoActivo) {
        inputPtoActivo.removeAttribute('readonly'); inputPtoActivo.focus();
        inputPtoActivo.addEventListener('blur', function() { verificarBM(this); syncBM(this); guardarBD(); }, {once: true}); 
    }
}

function verificarBM(input) {
    const val = input.value.toUpperCase().trim(); input.value = val; 
    let decs = getDecs(); let p = obtenerProyectoActivo(); const bmEncontrado = p.bms.find(b => b.nombre === val);
    const tr = input.closest('tr'); const tbody = document.getElementById('cuerpoIda');
    let rowIndex = Array.from(tbody.children).indexOf(tr);

    if (rowIndex === 0) {
        const inCotaBM = document.getElementById('cotaBM');
        if (bmEncontrado) { input.dataset.bmAsignado = val; inCotaBM.value = bmEncontrado.cota.toFixed(decs); } 
        else { input.dataset.bmAsignado = ""; }
    }
    procesarDobleLiga(); guardarBD();
}

function procesarAutoNombrar() {
    let trs = document.querySelectorAll('#cuerpoIda tr');
    let pcCount = 1;
    for(let i=1; i<trs.length; i++) {
        let inPto = trs[i].querySelector('.in-pto');
        let va = trs[i].querySelector('.in-va').value;
        let vd = trs[i].querySelector('.in-vd').value;
        
        if(inPto.value.trim() === "" && (va !== "" || vd !== "") && document.activeElement !== inPto) {
            inPto.value = "PC-" + pcCount;
        }
        if(inPto.value.startsWith("PC-")) pcCount++;
    }
}

function syncBM(input) {
    let trIda = input.closest('tr');
    if(!trIda || trIda.parentNode.id !== 'cuerpoIda') return;
    let tbodyIda = trIda.parentNode; let len = tbodyIda.children.length;
    
    procesarAutoNombrar();

    let filasVuelta = document.getElementById('cuerpoVuelta').children;

    for(let i=0; i<len; i++) { 
        let val = tbodyIda.children[i].querySelector('.in-pto').value.trim().toUpperCase(); 
        filasVuelta[i].querySelector('.in-pto').value = val;
    }
    guardarBD();
}

function reconstruirSincronizacion() {
    let tbodyIda = document.getElementById('cuerpoIda');
    if(tbodyIda.children.length > 0) syncBM(tbodyIda.children[0].querySelector('.in-pto'));
}

function borrarFilaEspecifica(btn) {
    let trIda = btn.closest('tr'); let tbodyIda = trIda.parentNode; let idx = Array.from(tbodyIda.children).indexOf(trIda);
    let pto = trIda.querySelector('.in-pto').value.trim() || `Estación ${idx + 1}`;
    showCustomConfirm(`⚠️ ¿Eliminar la lectura del punto: ${pto}? Se recalculará todo el circuito.`, () => {
        let tbodyVuelta = document.getElementById('cuerpoVuelta');
        tbodyIda.removeChild(trIda); tbodyVuelta.removeChild(tbodyVuelta.children[idx]);
        reconstruirSincronizacion(); procesarDobleLiga(); guardarBD(); showToast("Lectura eliminada", "success");
    });
}

let bmsExternosPolCache = [];

function recopilarBMsExternosPol() {
    let lista = [];
    let pActual = obtenerProyectoActivo();
    let nombresActuales = pActual ? pActual.bms.map(b => b.nombre) : [];

    appData.proyectos.forEach(proj => {
        if (proj.id !== appData.activoId && proj.bms) {
            proj.bms.forEach(bm => {
                if (!nombresActuales.includes(bm.nombre) && !lista.some(x => x.nombre === bm.nombre)) {
                    lista.push({ nombre: bm.nombre, cota: bm.cota, obs: bm.obs || `De: ${proj.nombre}`, origen: `Simultánea (${proj.nombre})` });
                }
            });
        }
    });

    const fuentes = [
        { key: 'cota100_db_simple_v4', label: 'Niv. Simple' },
        { key: 'cota100_db_alcan_v3', label: 'Alcantarillado' },
        { key: 'cota100_db_vial_v1', label: 'Carreteras' }
    ];

    fuentes.forEach(f => {
        try {
            let dbExt = JSON.parse(localStorage.getItem(f.key));
            if (dbExt && dbExt.proyectos) {
                dbExt.proyectos.forEach(proj => {
                    if (proj.bms) {
                        proj.bms.forEach(bm => {
                            if (!nombresActuales.includes(bm.nombre) && !lista.some(x => x.nombre === bm.nombre)) {
                                lista.push({ nombre: bm.nombre, cota: bm.cota, obs: bm.obs || `De ${f.label}: ${proj.nombre}`, origen: `${f.label} (${proj.nombre})` });
                            }
                        });
                    }
                });
            }
        } catch(e) {}
    });

    return lista;
}

function importarBMExternoPol(idx) {
    let bm = bmsExternosPolCache[idx];
    if (!bm) return;
    let p = obtenerProyectoActivo();
    if (p.bms.some(b => b.nombre === bm.nombre)) return showToast("Ese BM ya existe en el proyecto", "warning");
    p.bms.push({ nombre: bm.nombre, cota: Number(bm.cota), obs: bm.obs });
    guardarBD(); renderBMs(); cerrarModalSelect();
    showToast(`BM [${bm.nombre}] importado`, "success");
}

function importarTodosBMsExternosPol() {
    let p = obtenerProyectoActivo();
    let count = 0;
    bmsExternosPolCache.forEach(bm => {
        if (!p.bms.some(b => b.nombre === bm.nombre)) {
            p.bms.push({ nombre: bm.nombre, cota: Number(bm.cota), obs: bm.obs });
            count++;
        }
    });
    guardarBD(); renderBMs(); cerrarModalSelect();
    showToast(`${count} BMs importados con éxito`, "success");
}

function manejarEnterDobleLiga(event, input) {
    if (event.key === 'Enter') {
        event.preventDefault();
        let tr = input.closest('tr');
        let tbody = tr.parentNode;
        let isIda = (tbody.id === 'cuerpoIda');
        let rowIdx = Array.from(tbody.children).indexOf(tr);
        let filasIda = document.getElementById('cuerpoIda').children;
        let filasVuelta = document.getElementById('cuerpoVuelta').children;

        if (rowIdx === 0) {
            if (isIda && input.classList.contains('in-pto')) {
                filasIda[0].querySelector('.in-va').focus();
            } else if (isIda && input.classList.contains('in-va')) {
                filasVuelta[0].querySelector('.in-va').focus();
            } else if (!isIda && input.classList.contains('in-va')) {
                if (filasIda.length < 2) agregarFila(true);
                filasIda[1].querySelector('.in-vd').focus();
            }
        } else {
            if (isIda && input.classList.contains('in-pto')) {
                filasIda[rowIdx].querySelector('.in-vd').focus();
            } else if (isIda && input.classList.contains('in-vd')) {
                filasVuelta[rowIdx].querySelector('.in-vd').focus();
            } else if (!isIda && input.classList.contains('in-vd')) {
                filasIda[rowIdx].querySelector('.in-va').focus();
            } else if (isIda && input.classList.contains('in-va')) {
                filasVuelta[rowIdx].querySelector('.in-va').focus();
            } else if (!isIda && input.classList.contains('in-va')) {
                if (rowIdx === filasIda.length - 1) agregarFila(true);
                filasIda[rowIdx + 1].querySelector('.in-vd').focus();
            }
        }
    }
}

function agregarFila(isAuto = false, scrollDown = false) {
    if(tablaBloqueada) return; 
    const tbodyIda = document.getElementById('cuerpoIda'); const tbodyVuelta = document.getElementById('cuerpoVuelta');
    const idx = tbodyIda.children.length; 
    
    const trIda = document.createElement('tr');
    if (idx === 0) {
        trIda.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto bm-selector" placeholder="BM..." readonly onclick="abrirSelectorBM(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td class="td-readonly"><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" disabled></td>
            <td class="out-cota" style="padding: 2px;">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"></td>`;
    } else {
        trIda.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto" placeholder="Pto..." oninput="this.value = this.value.toUpperCase(); syncBM(this); procesarDobleLiga(); guardarBD();" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td class="out-cota">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"><button class="btn-del-fila" onclick="borrarFilaEspecifica(this)">✖</button></td>`;
    }
    
    const trVuelta = document.createElement('tr');
    if (idx === 0) {
        trVuelta.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto" placeholder="..." readonly></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td class="td-readonly"><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" disabled></td>
            <td class="out-cota" style="padding: 2px;">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"></td>`;
    } else {
        trVuelta.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto" placeholder="..." readonly></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)" onkeydown="manejarEnterDobleLiga(event, this)"></td>
            <td class="out-cota">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"></td>`;
    }

    tbodyIda.appendChild(trIda); tbodyVuelta.appendChild(trVuelta);
    if(!isAuto) guardarBD();
    
    if (scrollDown) {
        setTimeout(() => {
            document.getElementById('contenedorBotonesAdd').scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }
}

function quitarFila() { 
    if(tablaBloqueada) return; 
    const bi = document.getElementById('cuerpoIda'); const bv = document.getElementById('cuerpoVuelta'); 
    if (bi.children.length > 1) { 
        bi.removeChild(bi.lastChild); bv.removeChild(bv.lastChild); reconstruirSincronizacion(); procesarDobleLiga(); guardarBD(); 
    } 
}

function limpiarTabla() {
    if(tablaBloqueada) return; 
    showCustomConfirm("🚨 ¿Borrar todas las lecturas de este circuito?", () => {
        document.getElementById('cuerpoIda').innerHTML = ""; document.getElementById('cuerpoVuelta').innerHTML = "";
        for(let i = 0; i < 8; i++) agregarFila(true);
        document.getElementById('panelResultados').style.display = 'none';
        guardarBD(); showToast("Circuito reseteado", "success");
    });
}

function actualizarOrdenTxt() {
    let select = document.getElementById('ordenNiv'); let txt = document.getElementById('txtOrdenHelp');
    if(select.value === "0.004") txt.innerText = "Orden I: Alta precisión. Presas, redes geodésicas base, túneles extensos.";
    else if(select.value === "0.008") txt.innerText = "Orden II: Precisión media. Puentes importantes, viaductos, carreteras principales.";
    else if(select.value === "0.012") txt.innerText = "Orden III: Precisión básica. Drenaje, vías urbanas, alcantarillado, canales.";
    else txt.innerText = "Orden IV: Trabajos estándar de obra, movimiento de tierras y perfiles generales.";
}

function verificarCierreFinal() {
    let cotaBM = parseFloat(document.getElementById('cotaBM').value); let distM = parseFloat(document.getElementById('distanciaM').value);
    if(isNaN(cotaBM)) return showToast("⚠️ Debes ingresar tu Cota Inicial (BM) para calcular.", "warning");
    if(isNaN(distM) || distM <= 0) return showToast("⚠️ Debes ingresar la Distancia Total en metros.", "warning");
    
    procesarDobleLiga(); 
    
    let panel = document.getElementById('panelResultados');
    if(panel.style.display === 'block') { 
        panel.scrollIntoView({ behavior: 'smooth' }); 
        
        let estadoTag = document.getElementById('resEstado');
        if(estadoTag.classList.contains('estado-cumple')) {
            toggleBloqueoTabla(true);
            showToast("Cierre verificado. Tabla bloqueada por seguridad.", "success");
        } else {
            showToast("El cierre calculado presenta errores.", "warning");
        }
    }
}

function getErrorHUDStyles(pct) {
    if(pct > 85 && pct <= 100) return {c: '#f57f17', b: 'rgba(245, 127, 23, 0.1)'};
    if(pct > 100) return {c: 'var(--danger-color)', b: 'rgba(211,47,47,0.1)'};
    return {c: 'var(--success-text)', b: 'var(--success-bg)'};
}

function obtenerCotaOficialEstacion(ptoNombre, idxEstacion, ultimoIndice, cotaBMInicial, cotaLlegadaInput, p, ptoInicioNombre) {
    if (idxEstacion === 0) return cotaBMInicial;
    if (idxEstacion === ultimoIndice) {
        if (!isNaN(cotaLlegadaInput)) return cotaLlegadaInput;
        if (ptoNombre && ptoInicioNombre && ptoNombre === ptoInicioNombre) return cotaBMInicial;
    }
    if (p && Array.isArray(p.bms)) {
        let bmMatch = p.bms.find(b => b.nombre === ptoNombre);
        if (bmMatch) return bmMatch.cota;
    }
    return NaN;
}

/* --- MOTOR MATEMÁTICO DE DOBLE LIGA EN ENTEROS ESCALADOS --- */
function procesarDobleLiga() {
    let decs = getDecs();
    let factorMM = 1000 / Math.pow(10, decs);
    let cotaBM = parseFloat(document.getElementById('cotaBM').value);
    let cotaBMInt = toScaledInt(cotaBM, decs);
    let distM = parseFloat(document.getElementById('distanciaM').value);
    let tolTramoMM = parseFloat(document.getElementById('tolTramo').value) || 2;
    let multiplicador = parseFloat(document.getElementById('ordenNiv').value);

    let filasIda = document.querySelectorAll('#cuerpoIda tr');
    let filasVuelta = document.querySelectorAll('#cuerpoVuelta tr');
    if(filasIda.length === 0) return;

    procesarAutoNombrar();
    reconstruirSincronizacion();

    let cotaActIdaInt = NaN, aiIdaInt = NaN;
    let cotaActVueltaInt = NaN, aiVueltaInt = NaN;
    let ultimaCotaIdaValida = NaN, ultimaCotaVueltaValida = NaN;
    let habilitarSiguiente = true; 

    for(let i = 0; i < filasIda.length; i++) {
        if (habilitarSiguiente) {
            filasIda[i].classList.remove('fila-inactiva');
            filasVuelta[i].classList.remove('fila-inactiva');
        } else {
            filasIda[i].classList.add('fila-inactiva');
            filasVuelta[i].classList.add('fila-inactiva');
            filasIda[i].querySelector('.out-cota').innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`;
            filasVuelta[i].querySelector('.out-cota').innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`;
            filasIda[i].style.boxShadow = "none";
            filasVuelta[i].style.backgroundColor = "transparent";
            continue; 
        }

        let vaIdaInt = toScaledInt(filasIda[i].querySelector('.in-va').value, decs);
        let vdIdaInt = toScaledInt(filasIda[i].querySelector('.in-vd').value, decs);
        let vaVueltaInt = toScaledInt(filasVuelta[i].querySelector('.in-va').value, decs);
        let vdVueltaInt = toScaledInt(filasVuelta[i].querySelector('.in-vd').value, decs);
        
        let celdaIda = filasIda[i].querySelector('.out-cota');
        let celdaVuelta = filasVuelta[i].querySelector('.out-cota');
        let badgeInvisible = `<div class="badge-tramo badge-oculto">_</div>`;

        let agresteIda = (!isNaN(vaIdaInt) && !isNaN(vdIdaInt) && Math.abs(fromScaledInt(vaIdaInt - vdIdaInt, decs)) > 2.50);
        if(agresteIda) {
            filasIda[i].style.boxShadow = "inset 0 0 0 2px #fbc02d";
            filasIda[i].title = "Riesgo de visual corta en siguiente armada";
        } else {
            filasIda[i].style.boxShadow = "none";
            filasIda[i].title = "";
        }

        // --- CÁLCULO DE COTAS LÍNEA 1 (IZQ) ---
        if (i === 0) {
            cotaActIdaInt = cotaBMInt;
            if (!isNaN(cotaActIdaInt)) {
                let cotaMetros = fromScaledInt(cotaActIdaInt, decs);
                ultimaCotaIdaValida = cotaMetros;
                if (!isNaN(vaIdaInt)) {
                    aiIdaInt = cotaActIdaInt + vaIdaInt;
                    let aiMetros = fromScaledInt(aiIdaInt, decs);
                    celdaIda.innerHTML = `<div style="font-size:0.75rem; color:#1976d2;">AI: ${aiMetros.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${badgeInvisible}`;
                } else {
                    celdaIda.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${badgeInvisible}`;
                }
            } else {
                celdaIda.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>${badgeInvisible}`;
            }
        } else {
            if (!isNaN(vdIdaInt) && !isNaN(aiIdaInt)) {
                cotaActIdaInt = aiIdaInt - vdIdaInt;
                let cotaMetros = fromScaledInt(cotaActIdaInt, decs);
                ultimaCotaIdaValida = cotaMetros;
                if (!isNaN(vaIdaInt)) {
                    aiIdaInt = cotaActIdaInt + vaIdaInt;
                    let aiMetros = fromScaledInt(aiIdaInt, decs);
                    celdaIda.innerHTML = `<div style="font-size:0.75rem; color:#1976d2;">AI: ${aiMetros.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${badgeInvisible}`;
                } else {
                    celdaIda.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${badgeInvisible}`;
                }
            } else {
                celdaIda.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>${badgeInvisible}`;
            }
        }

        // --- CÁLCULO DE COTAS Y HUD DE ERROR - LÍNEA 2 (DER) ---
        let hudHTML = '';
        let isPC = filasIda[i].querySelector('.in-pto').value.toUpperCase().trim().startsWith("PC");

        if (i === 0) {
            cotaActVueltaInt = cotaBMInt;
            if (!isNaN(vaIdaInt) && !isNaN(vaVueltaInt)) {
                let errorMM = Math.abs(vaIdaInt - vaVueltaInt) * factorMM;
                let pct = tolTramoMM > 0 ? (errorMM / tolTramoMM) * 100 : 0;
                let st = getErrorHUDStyles(pct);
                let alert = pct > 100 ? ' ⚠️' : '';
                hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:${st.c}; background:${st.b}; border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Δ Arranque: ${errorMM.toFixed(1)}mm | ${pct.toFixed(0)}%${alert}</div>`;
                filasVuelta[i].style.backgroundColor = pct > 100 ? 'rgba(211,47,47,0.05)' : 'transparent';
            }
            if (!isNaN(cotaActVueltaInt)) {
                let cotaMetros = fromScaledInt(cotaActVueltaInt, decs);
                ultimaCotaVueltaValida = cotaMetros;
                if (!isNaN(vaVueltaInt)) { 
                    aiVueltaInt = cotaActVueltaInt + vaVueltaInt; 
                    let aiMetros = fromScaledInt(aiVueltaInt, decs);
                    celdaVuelta.innerHTML = `<div style="font-size:0.75rem; color:var(--corte-color);">AI: ${aiMetros.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${hudHTML}`; 
                } else {
                    celdaVuelta.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${hudHTML}`;
                }
            } else {
                celdaVuelta.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`;
            }
        } else {
            if (!isNaN(vdVueltaInt) && !isNaN(aiVueltaInt)) {
                cotaActVueltaInt = aiVueltaInt - vdVueltaInt;
                let cotaMetros = fromScaledInt(cotaActVueltaInt, decs);
                ultimaCotaVueltaValida = cotaMetros;
                if (!isNaN(vaVueltaInt)) aiVueltaInt = cotaActVueltaInt + vaVueltaInt;

                if (isPC) {
                    if (!isNaN(vdIdaInt) && !isNaN(vdVueltaInt) && !isNaN(vaIdaInt) && !isNaN(vaVueltaInt)) {
                        let diffVDInt = vdIdaInt - vdVueltaInt;
                        let diffVAInt = vaIdaInt - vaVueltaInt;
                        let errorMM = Math.abs(diffVDInt - diffVAInt) * factorMM;
                        let pct = tolTramoMM > 0 ? (errorMM / tolTramoMM) * 100 : 0;
                        let st = getErrorHUDStyles(pct);
                        let alert = pct > 100 ? ' ⚠️' : '';
                        hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:${st.c}; background:${st.b}; border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Δ PC: ${errorMM.toFixed(1)}mm | ${pct.toFixed(0)}%${alert}</div>`;
                        filasVuelta[i].style.backgroundColor = pct > 100 ? 'rgba(211,47,47,0.05)' : 'transparent';
                    } else if (!isNaN(vdIdaInt) && !isNaN(vdVueltaInt)) {
                        let diffVDMM = Math.abs(vdIdaInt - vdVueltaInt) * factorMM;
                        hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:#1976d2; background:rgba(25,118,210,0.1); border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Dif. Lectura: ${diffVDMM.toFixed(1)}mm</div>`;
                        filasVuelta[i].style.backgroundColor = 'transparent';
                    }
                } else {
                    if (!isNaN(vdIdaInt) && !isNaN(vdVueltaInt) && !isNaN(cotaActIdaInt)) {
                        let errorMM = Math.abs(cotaActIdaInt - cotaActVueltaInt) * factorMM;
                        let pct = tolTramoMM > 0 ? (errorMM / tolTramoMM) * 100 : 0;
                        let st = getErrorHUDStyles(pct);
                        let alert = pct > 100 ? ' ⚠️' : '';
                        hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:${st.c}; background:${st.b}; border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Δ Cierre: ${errorMM.toFixed(1)}mm | ${pct.toFixed(0)}%${alert}</div>`;
                        filasVuelta[i].style.backgroundColor = pct > 100 ? 'rgba(211,47,47,0.05)' : 'transparent';
                    }
                }

                if (!isNaN(vaVueltaInt)) {
                    let aiMetros = fromScaledInt(aiVueltaInt, decs);
                    celdaVuelta.innerHTML = `<div style="font-size:0.75rem; color:var(--corte-color);">AI: ${aiMetros.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${hudHTML}`;
                } else {
                    celdaVuelta.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaMetros}">${cotaMetros.toFixed(decs)}</div>${hudHTML}`;
                }
            } else {
                celdaVuelta.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`;
            }
        }

        if (i === 0) {
            if (isNaN(vaIdaInt) || isNaN(vaVueltaInt) || isNaN(cotaBMInt)) habilitarSiguiente = false;
        } else {
            if (isNaN(vaIdaInt) || isNaN(vdIdaInt) || isNaN(vaVueltaInt) || isNaN(vdVueltaInt)) habilitarSiguiente = false;
        }
    }

    document.getElementById('contenedorCompensadas').style.display = 'none';

    if(!isNaN(cotaBM) && !isNaN(distM) && distM > 0 && filasIda.length > 0 && !isNaN(ultimaCotaIdaValida) && !isNaN(ultimaCotaVueltaValida)) {
        let p = obtenerProyectoActivo();
        let cotaLlegadaInput = parseFloat(document.getElementById('cotaLlegada').value);
        let anchors = [];
        let filledRows = 0;
        let ultimoLleno = -1;

        for(let i = 0; i < filasIda.length; i++) {
            if (filasIda[i].classList.contains('fila-inactiva')) continue;
            let divIda = filasIda[i].querySelector('.out-cota div[data-cota]');
            let divVuelta = filasVuelta[i].querySelector('.out-cota div[data-cota]');
            if (!divIda || !divVuelta) continue;

            let pto = filasIda[i].querySelector('.in-pto').value.trim().toUpperCase();
            if(pto !== "") {
                filledRows++;
                ultimoLleno = i;
                if(i === 0 || !pto.startsWith("PC")) anchors.push(i);
            }
        }

        if(ultimoLleno > 0 && (anchors.length === 0 || ultimoLleno > anchors[anchors.length - 1])) {
            anchors.push(ultimoLleno);
        }

        let htmlSeg = "";
        let todosCumplen = true;
        let ptoInicioNombre = filasIda[0].querySelector('.in-pto').value.toUpperCase().trim();

        if(anchors.length > 1) {
            let distPerSetup = distM / (filledRows > 1 ? filledRows - 1 : 1);

            for(let k = 0; k < anchors.length - 1; k++) {
                let start = anchors[k];
                let end = anchors[k+1];
                let ptoStart = filasIda[start].querySelector('.in-pto').value.toUpperCase().trim();
                let ptoEnd = filasIda[end].querySelector('.in-pto').value.toUpperCase().trim();

                let divIda = filasIda[end].querySelector('.out-cota div[data-cota]');
                let cotaIdaEnd = divIda ? parseFloat(divIda.getAttribute('data-cota')) : NaN;
                let divVuelta = filasVuelta[end].querySelector('.out-cota div[data-cota]');
                let cotaVueltaEnd = divVuelta ? parseFloat(divVuelta.getAttribute('data-cota')) : NaN;

                if(!isNaN(cotaIdaEnd) && !isNaN(cotaVueltaEnd)) {
                    let errLineas = Math.abs(cotaIdaEnd - cotaVueltaEnd);
                    let promEnd = (cotaIdaEnd + cotaVueltaEnd) / 2.0;
                    let setups = end - start;
                    let distTramo = setups * distPerSetup;
                    let tolTramo = multiplicador * Math.sqrt(distTramo / 1000);

                    let cotaOficialTarget = obtenerCotaOficialEstacion(ptoEnd, end, ultimoLleno, cotaBM, cotaLlegadaInput, p, ptoInicioNombre);
                    let errContraBM = !isNaN(cotaOficialTarget) ? Math.abs(promEnd - cotaOficialTarget) : NaN;
                    let cumple = (errLineas <= tolTramo + 1e-7) && (isNaN(errContraBM) || errContraBM <= tolTramo + 1e-7);
                    if(!cumple) todosCumplen = false;

                    let bgCumple = document.body.classList.contains('dark-mode') ? 'rgba(46,125,50,0.1)' : '#f1f8e9';
                    let bgFalla = document.body.classList.contains('dark-mode') ? 'rgba(211,47,47,0.1)' : '#ffebee';
                    let borderCumple = document.body.classList.contains('dark-mode') ? 'var(--success-text)' : '#a5d6a7';
                    let borderFalla = document.body.classList.contains('dark-mode') ? 'var(--danger-color)' : '#ef9a9a';

                    let diffFirmadoBM = !isNaN(cotaOficialTarget) ? (promEnd - cotaOficialTarget) : 0;
                    let lineaExtraBM = !isNaN(errContraBM)
                        ? `<div style="font-size:0.85rem; margin-top:4px; padding-top:4px; border-top:1px dashed rgba(128,128,128,0.3); display:flex; justify-content:space-between;">
                             <span>Cota BM Oficial: <strong>${cotaOficialTarget.toFixed(decs)} m</strong></span>
                             <span>Err. vs BM: <strong>${(diffFirmadoBM > 0 ? '+' : '') + diffFirmadoBM.toFixed(4)} m</strong></span>
                           </div>`
                        : '';

                    htmlSeg += `
                        <div style="border: 2px solid ${cumple ? borderCumple : borderFalla}; border-radius: 6px; padding: 10px; margin-bottom: 10px; text-align: left; background: ${cumple ? bgCumple : bgFalla};">
                            <div style="font-weight: 900; color: var(--text-color); margin-bottom: 5px;">📍 ${ptoStart} ➔ ${ptoEnd} <span style="float:right; font-size:0.8rem; opacity:0.8;">(${setups} armadas)</span></div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; color: var(--text-color); opacity: 0.9;">
                                <span>Discrepancia (L1 vs L2): <strong>${errLineas.toFixed(4)} m</strong></span>
                                <span>Tol: <strong>±${tolTramo.toFixed(4)} m</strong></span>
                            </div>
                            ${lineaExtraBM}
                        </div>
                    `;
                }
            }
        }
        
        document.getElementById('contenedorSegmentos').innerHTML = htmlSeg;
        
        let distKm = distM / 1000; 
        let toleranciaGlobal = multiplicador * Math.sqrt(distKm);
        let discrepanciaGlobalLineas = Math.abs(ultimaCotaIdaValida - ultimaCotaVueltaValida);
        let ptoFinalNombre = ultimoLleno >= 0 ? filasIda[ultimoLleno].querySelector('.in-pto').value.toUpperCase().trim() : "";
        let cotaRefFinalGlobal = ultimoLleno > 0
            ? obtenerCotaOficialEstacion(ptoFinalNombre, ultimoLleno, ultimoLleno, cotaBM, cotaLlegadaInput, p, ptoInicioNombre)
            : NaN;

        let errorCierreGlobal = discrepanciaGlobalLineas;
        if(!isNaN(cotaRefFinalGlobal)) {
            let promedioFinal = (ultimaCotaIdaValida + ultimaCotaVueltaValida) / 2.0;
            errorCierreGlobal = Math.abs(promedioFinal - cotaRefFinalGlobal);
        }

        document.getElementById('resError').innerText = errorCierreGlobal.toFixed(4) + " m";
        document.getElementById('resTol').innerText = "±" + toleranciaGlobal.toFixed(4) + " m";

        let estadoTag = document.getElementById('resEstado');
        let globalCumple = (errorCierreGlobal <= toleranciaGlobal + 1e-7) && (discrepanciaGlobalLineas <= toleranciaGlobal + 1e-7) && todosCumplen;
        if(globalCumple) {
            estadoTag.innerText = "✓ CUMPLE ESPECIFICACIONES";
            estadoTag.className = "estado-cumple";
            document.getElementById('btnCompensar').style.display = 'block';
        } else {
            estadoTag.innerText = "❌ RECHAZADO (REVISAR TRAMOS)";
            estadoTag.className = "estado-falla";
            document.getElementById('btnCompensar').style.display = 'none';
        }
        document.getElementById('panelResultados').style.display = 'block';
    } else {
        document.getElementById('panelResultados').style.display = 'none';
    }
}

/* --- COMPENSACIÓN RIGUROSA POR TRAMOS ENTRE BMs DE CONTROL --- */
function calcularEstacionesCompensadas() {
    let decs = getDecs();
    let p = obtenerProyectoActivo();
    const cotaBM = parseFloat(document.getElementById('cotaBM').value);
    const cotaLlegadaInput = parseFloat(document.getElementById('cotaLlegada').value);
    const filasIda = document.querySelectorAll('#cuerpoIda tr'); 
    const filasVuelta = document.querySelectorAll('#cuerpoVuelta tr');

    let datosEstaciones = [];
    for(let i = 0; i < filasIda.length; i++) {
        if (filasIda[i].classList.contains('fila-inactiva')) continue;
        let pto = filasIda[i].querySelector('.in-pto').value.toUpperCase().trim();
        if (!pto) continue;
        let cotaIda = NaN, cotaVuelta = NaN;
        
        if (i === 0) { 
            cotaIda = isNaN(cotaBM) ? NaN : cotaBM; 
            cotaVuelta = isNaN(cotaBM) ? NaN : cotaBM; 
        } else {
            let divCotaIda = filasIda[i].querySelector('.out-cota div[data-cota]');
            if (divCotaIda) cotaIda = parseFloat(divCotaIda.getAttribute('data-cota'));
            let divCotaVuelta = filasVuelta[i].querySelector('.out-cota div[data-cota]');
            if (divCotaVuelta) cotaVuelta = parseFloat(divCotaVuelta.getAttribute('data-cota'));
        }

        if (!isNaN(cotaIda) && !isNaN(cotaVuelta)) {
            let promCrudo = (cotaIda + cotaVuelta) / 2.0;
            datosEstaciones.push({
                pto: pto,
                cotaIda: cotaIda,
                cotaVuelta: cotaVuelta,
                promCrudo: promCrudo,
                cotaCompensada: promCrudo,
                esPC: pto.startsWith("PC")
            });
        }
    }

    if (datosEstaciones.length < 2) return [];
    let N = datosEstaciones.length - 1;
    let ptoInicioNombre = datosEstaciones[0].pto;

    // Identificar estaciones con Cota Oficial fija (Inicio, BMs oficiales intermedios y Cierre final conocido)
    let controles = [];
    for (let i = 0; i <= N; i++) {
        if (i > 0 && datosEstaciones[i].esPC) continue;
        let cotaOficial = obtenerCotaOficialEstacion(datosEstaciones[i].pto, i, N, cotaBM, cotaLlegadaInput, p, ptoInicioNombre);
        if (!isNaN(cotaOficial)) {
            controles.push({
                idx: i,
                target: cotaOficial,
                err: datosEstaciones[i].promCrudo - cotaOficial
            });
        }
    }

    if (controles.length >= 2) {
        for (let c = 0; c < controles.length - 1; c++) {
            let ctrlA = controles[c];
            let ctrlB = controles[c + 1];
            let span = ctrlB.idx - ctrlA.idx;
            for (let i = ctrlA.idx; i <= ctrlB.idx; i++) {
                let frac = span > 0 ? (i - ctrlA.idx) / span : 0;
                let errInterpolado = ctrlA.err + frac * (ctrlB.err - ctrlA.err);
                let compVal = datosEstaciones[i].promCrudo - errInterpolado;
                datosEstaciones[i].cotaCompensada = fromScaledInt(toScaledInt(compVal, decs), decs);
            }
        }
        // Si quedaron estaciones después del último BM oficial conocido, arrastran la corrección fija del último control
        let ultimoCtrl = controles[controles.length - 1];
        for (let i = ultimoCtrl.idx + 1; i <= N; i++) {
            let compVal = datosEstaciones[i].promCrudo - ultimoCtrl.err;
            datosEstaciones[i].cotaCompensada = fromScaledInt(toScaledInt(compVal, decs), decs);
        }
    } else {
        for (let i = 0; i <= N; i++) {
            datosEstaciones[i].cotaCompensada = fromScaledInt(toScaledInt(datosEstaciones[i].promCrudo, decs), decs);
        }
    }

    return datosEstaciones;
}

function generarCompensadas() {
    let decs = getDecs();
    let datosEstaciones = calcularEstacionesCompensadas();
    if (datosEstaciones.length < 2) return;

    const tablaCompensada = document.getElementById('tablaCompensada');
    tablaCompensada.querySelector('thead').innerHTML = `<tr><th>PUNTO</th><th>COTA L1</th><th>COTA L2</th><th>PROMEDIO</th><th>COMPENSADA</th></tr>`;
    
    const cuerpoCompensadas = document.getElementById('cuerpoCompensadas'); 
    cuerpoCompensadas.innerHTML = "";

    datosEstaciones.forEach(data => {
        if (!data.esPC) {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--primary-color); font-weight: 900;">${data.pto}</td>
                <td>${data.cotaIda.toFixed(decs)}</td>
                <td>${data.cotaVuelta.toFixed(decs)}</td>
                <td style="color:#1976d2; font-weight: 700;">${data.promCrudo.toFixed(decs)}</td>
                <td style="color:var(--success-text); font-weight: 900; background: rgba(46,125,50,0.05);">${data.cotaCompensada.toFixed(decs)}</td>
            `;
            cuerpoCompensadas.appendChild(tr);
        }
    });

    document.getElementById('contenedorCompensadas').style.display = 'block';
    setTimeout(() => { document.getElementById('contenedorCompensadas').scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);
    showToast("Cotas compensadas rigurosamente", "success");
}

function exportarCSVparaCivil3D() {
    cerrarModalSelect();
    let compRows = document.querySelectorAll('#cuerpoCompensadas tr');
    if(compRows.length === 0) return showToast("Primero debes obtener cotas compensadas.", "warning");
    
    let decs = getDecs();
    let delim = globalConfig.delimitadorCSV || ",";
    let csvContent = `Punto${delim}Este${delim}Norte${delim}Elevacion${delim}Descripcion\n`;
    let ptoCount = 1;

    compRows.forEach(tr => {
        let tds = tr.querySelectorAll('td');
        let ptoStr = tds[0].innerText.trim();
        let elevStr = parseFloat(tds[4].innerText).toFixed(decs);
        csvContent += `${ptoCount}${delim}1000.000${delim}1000.000${delim}${elevStr}${delim}${ptoStr}\n`;
        ptoCount++;
    });

    let p = obtenerProyectoActivo();
    let blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${p.nombre.replace(/\s+/g, '_')}_Civil3D.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV generado para Civil 3D", "success");
}

// Función auxiliar para generar variación realista de altura de instrumento en Vuelta Camuflada
function calcularShiftTripodeSeguroInt(vaOrigInt, vdOrigInt, indiceSemilla, limiteMira, decs = getDecs()) {
    let posiblesOffsets = [-0.142, 0.118, -0.087, 0.164, -0.113, 0.092, -0.156, 0.131, -0.074, 0.148];
    let deltaInt = toScaledInt(posiblesOffsets[indiceSemilla % posiblesOffsets.length], decs);
    let minSeguroInt = toScaledInt(0.350, decs);
    let maxSeguroInt = toScaledInt((limiteMira || 5.0) - 0.150, decs);

    if ((vaOrigInt + deltaInt) < minSeguroInt || (vdOrigInt + deltaInt) < minSeguroInt) {
        deltaInt = Math.abs(deltaInt);
    }
    if ((vaOrigInt + deltaInt) > maxSeguroInt || (vdOrigInt + deltaInt) > maxSeguroInt) {
        deltaInt = -Math.abs(deltaInt);
    }
    if ((vaOrigInt + deltaInt) < minSeguroInt || (vdOrigInt + deltaInt) < minSeguroInt ||
        (vaOrigInt + deltaInt) > maxSeguroInt || (vdOrigInt + deltaInt) > maxSeguroInt) {
        deltaInt = 0;
    }
    return deltaInt;
}

/* --- MOTOR DE EXPORTACIÓN MAESTRO (EXCEL CONTINUO EN IDA Y VUELTA Y TABLA COMPENSADA) --- */
function exportarExcelPlantilla(modo) {
    cerrarModalSelect();
    let p = obtenerProyectoActivo();
    let decs = getDecs();
    let numFmtStr = "0." + "0".repeat(decs);
    let limiteMira = parseFloat(globalConfig.alertaMira) || 5.000;
    let wb = XLSX.utils.book_new();
    
    let isCamuflaje = (modo === 'ida_vuelta');
    let tituloRep = isCamuflaje ? "NIVELACIÓN IDA Y VUELTA" : "NIVELACIÓN LÍNEAS GEMELAS (PATA DE GALLO)";
    let titL1 = isCamuflaje ? "IDA" : "LÍNEA 1 (IZQ)";
    let titL2 = isCamuflaje ? "VUELTA" : "LÍNEA 2 (DER)";
    
    let styleTit = { fill: { fgColor: { rgb: "FF000000" } }, font: { bold: true, sz: 14, color: { rgb: "FFDDAA00" } }, alignment: { horizontal: "center", vertical: "center" } };
    let headIda = { fill: { fgColor: { rgb: "FFFFA000" } }, font: { bold: true, color: {rgb: "FF000000"} }, alignment: { horizontal: "center", vertical: "center" } };
    let headVuelta = { fill: { fgColor: { rgb: "FFFFA000" } }, font: { bold: true, color: {rgb: "FF000000"} }, alignment: { horizontal: "center", vertical: "center" } };
    
    let cellCenter = { alignment: { horizontal: "center", vertical: "center" } };
    let cellDec = { alignment: { horizontal: "center", vertical: "center" }, numFmt: numFmtStr };
    let cellCota = { alignment: { horizontal: "center", vertical: "center" }, numFmt: numFmtStr };
    
    let cellSum = { fill: { fgColor: { rgb: "FFFFA000" } }, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, numFmt: numFmtStr };
    let cellSumDiff = { fill: { fgColor: { rgb: "FFFFD54F" } }, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, numFmt: numFmtStr };

    let wsData = [];
    wsData.push([{v: tituloRep, s: styleTit}, null, null, null, null, null, null, null, null, null, null, null, null]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, null]);
    
    let fechaActual = new Date().toISOString().split('T')[0];
    let nomOperador = globalConfig.operador || "COTA100";
    let nomEquipo = globalConfig.equipo || "";
    wsData.push([{v: "PROYECTO    :"}, {v: p.nombre}, null, null, {v: "FECHA         :"}, {v: fechaActual}, null, null, null, null, null, null, null]);
    wsData.push([{v: "TOPOGRAFO :"}, {v: nomOperador}, null, null, {v: nomEquipo ? "EQUIPO        :" : ""}, {v: nomEquipo}, null, null, null, null, null, null, null]);
    
    let tramoTexto = (p.params.cotaBM && p.params.cotaLlegada) ? `${p.params.cotaBM} --- ${p.params.cotaLlegada}` : "CIRCUITO";
    wsData.push([{v: "TRAMO        :"}, {v: tramoTexto}, null, null, null, null, null, null, null, null, null, null, null]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, null]);
    
    wsData.push([{v: titL1, s: headIda}, null, null, null, null, null, null, {v: titL2, s: headVuelta}, null, null, null, null, null]);
    wsData.push([
        {v: "PTO", s: headIda}, {v: "VA", s: headIda}, {v: "ALT.", s: headIda}, {v: "VD", s: headIda}, {v: "COTA", s: headIda}, {v: "OBS", s: headIda}, null,
        {v: "PTO", s: headVuelta}, {v: "VA", s: headVuelta}, {v: "ALT.", s: headVuelta}, {v: "VD", s: headVuelta}, {v: "COTA", s: headVuelta}, {v: "OBS", s: headVuelta}
    ]);

    let filasIda = document.querySelectorAll('#cuerpoIda tr');
    let filasVuelta = document.querySelectorAll('#cuerpoVuelta tr');
    let dataL1 = []; let dataL2 = [];
    
    let cotaBM = parseFloat(document.getElementById('cotaBM').value);
    let cotaBMInt = toScaledInt(cotaBM, decs);
    let ai1Int = 0, cota1Int = cotaBMInt;
    let ai2Int = 0, cota2Int = cotaBMInt;

    for (let i = 0; i < filasIda.length; i++) {
        if (filasIda[i].classList.contains('fila-inactiva')) continue;
        let pto = filasIda[i].querySelector('.in-pto').value.trim().toUpperCase() || "";
        if (!pto) continue;
        
        let va1Int = toScaledInt(filasIda[i].querySelector('.in-va').value, decs);
        let vd1Int = toScaledInt(filasIda[i].querySelector('.in-vd').value, decs);
        let va2Int = toScaledInt(filasVuelta[i].querySelector('.in-va').value, decs);
        let vd2Int = toScaledInt(filasVuelta[i].querySelector('.in-vd').value, decs);
        
        let bmObj = p.bms.find(b => b.nombre === pto);
        let obs1 = bmObj ? (bmObj.obs || "") : "";
        
        if (i === 0) {
            cota1Int = cotaBMInt; cota2Int = cotaBMInt;
            ai1Int = cota1Int + va1Int; ai2Int = cota2Int + va2Int;
            dataL1.push({ pto, vaInt: va1Int, aiInt: ai1Int, vdInt: NaN, cotaInt: cota1Int, obs: obs1 });
            dataL2.push({ pto, vaInt: va2Int, aiInt: ai2Int, vdInt: NaN, cotaInt: cota2Int, obs: obs1 });
        } else {
            if (isNaN(vd1Int) || isNaN(vd2Int)) continue;
            cota1Int = ai1Int - vd1Int; cota2Int = ai2Int - vd2Int;
            let currentAi1Int = isNaN(va1Int) ? NaN : (cota1Int + va1Int);
            let currentAi2Int = isNaN(va2Int) ? NaN : (cota2Int + va2Int);
            dataL1.push({ pto, vaInt: va1Int, aiInt: currentAi1Int, vdInt: vd1Int, cotaInt: cota1Int, obs: obs1 });
            dataL2.push({ pto, vaInt: va2Int, aiInt: currentAi2Int, vdInt: vd2Int, cotaInt: cota2Int, obs: obs1 });
            ai1Int = currentAi1Int; ai2Int = currentAi2Int;
        }
    }
    
    let exportL2 = [];
    if (isCamuflaje && dataL2.length > 0) {
        let N = dataL2.length - 1;
        // La Vuelta parte exactamente de la Cota Final a la que llegó la Ida (dataL1[N].cotaInt)
        // para que la libreta sea 100% continua y el error de cierre aparezca al llegar de regreso al BM inicial.
        let cotaRetornoInt = dataL1[N].cotaInt; 
        let currentAiRetInt = 0;
        let pcCount = 1;
        
        let shiftsArmadaInt = [];
        for (let k = 0; k < N; k++) {
            let srcVaInt = dataL2[N - k].vdInt;
            let srcVdInt = dataL2[N - k - 1].vaInt;
            shiftsArmadaInt.push(calcularShiftTripodeSeguroInt(srcVaInt, srcVdInt, k, limiteMira, decs));
        }
        
        for (let i = 0; i <= N; i++) {
            let src = N - i; 
            let ptoOrig = dataL1[src].pto;
            let ptoNombre = "";
            if (i === 0 || i === N || !ptoOrig.startsWith("PC")) {
                ptoNombre = ptoOrig;
            } else {
                ptoNombre = "PC-" + pcCount;
                pcCount++;
            }
            
            if (i === 0) {
                let vaRetInt = dataL2[src].vdInt + shiftsArmadaInt[0];
                currentAiRetInt = cotaRetornoInt + vaRetInt;
                exportL2.push({ pto: ptoNombre, vaInt: vaRetInt, aiInt: currentAiRetInt, vdInt: NaN, cotaInt: cotaRetornoInt, obs: dataL2[src].obs });
            } else if (i === N) {
                let vdRetInt = dataL2[src].vaInt + shiftsArmadaInt[N - 1];
                let cotaLlegadaRetInt = currentAiRetInt - vdRetInt;
                exportL2.push({ pto: ptoNombre, vaInt: NaN, aiInt: NaN, vdInt: vdRetInt, cotaInt: cotaLlegadaRetInt, obs: dataL2[src].obs });
            } else {
                let vdRetInt = dataL2[src].vaInt + shiftsArmadaInt[i - 1];
                let vaRetInt = dataL2[src].vdInt + shiftsArmadaInt[i];
                let cotaIntermediaInt = currentAiRetInt - vdRetInt;
                currentAiRetInt = cotaIntermediaInt + vaRetInt;
                exportL2.push({ pto: ptoNombre, vaInt: vaRetInt, aiInt: currentAiRetInt, vdInt: vdRetInt, cotaInt: cotaIntermediaInt, obs: dataL2[src].obs });
            }
        }
    } else {
        exportL2 = dataL2;
    }
    
    let sumVaIdaInt = 0, sumVdIdaInt = 0, sumVaVueltaInt = 0, sumVdVueltaInt = 0;
    let NLast = dataL1.length - 1;
    for (let i = 0; i <= NLast; i++) {
        // En Pata de Gallo o Ida/Vuelta, solo se suman las lecturas que forman parte del circuito (0 a N-1 para VA, 1 a N para VD)
        if (i < NLast && !isNaN(dataL1[i].vaInt)) sumVaIdaInt += dataL1[i].vaInt;
        if (i > 0 && !isNaN(dataL1[i].vdInt)) sumVdIdaInt += dataL1[i].vdInt;
        if (i < NLast && !isNaN(exportL2[i].vaInt)) sumVaVueltaInt += exportL2[i].vaInt;
        if (i > 0 && !isNaN(exportL2[i].vdInt)) sumVdVueltaInt += exportL2[i].vdInt;
    }

    let rowCount = Math.max(dataL1.length, exportL2.length);
    for (let i = 0; i < rowCount; i++) {
        let r1 = dataL1[i] || {pto:"", vaInt:NaN, aiInt:NaN, vdInt:NaN, cotaInt:NaN, obs:""};
        let r2 = exportL2[i] || {pto:"", vaInt:NaN, aiInt:NaN, vdInt:NaN, cotaInt:NaN, obs:""};
        
        let va1Out = (i === NLast && isCamuflaje) ? NaN : r1.vaInt;
        let ai1Out = (i === NLast && isCamuflaje) ? NaN : r1.aiInt;
        let va2Out = (i === NLast) ? NaN : r2.vaInt;
        let ai2Out = (i === NLast) ? NaN : r2.aiInt;

        wsData.push([
            {v: r1.pto, s: cellCenter}, 
            isNaN(va1Out) ? {v: ""} : {v: fromScaledInt(va1Out, decs), t: 'n', s: cellDec},
            isNaN(ai1Out) ? {v: "-"} : {v: fromScaledInt(ai1Out, decs), t: 'n', s: cellDec},
            isNaN(r1.vdInt) ? {v: ""} : {v: fromScaledInt(r1.vdInt, decs), t: 'n', s: cellDec},
            isNaN(r1.cotaInt) ? {v: ""} : {v: fromScaledInt(r1.cotaInt, decs), t: 'n', s: cellCota},
            {v: r1.obs}, null, 
            {v: r2.pto, s: cellCenter}, 
            isNaN(va2Out) ? {v: ""} : {v: fromScaledInt(va2Out, decs), t: 'n', s: cellDec},
            isNaN(ai2Out) ? {v: "-"} : {v: fromScaledInt(ai2Out, decs), t: 'n', s: cellDec},
            isNaN(r2.vdInt) ? {v: ""} : {v: fromScaledInt(r2.vdInt, decs), t: 'n', s: cellDec},
            isNaN(r2.cotaInt) ? {v: ""} : {v: fromScaledInt(r2.cotaInt, decs), t: 'n', s: cellCota},
            {v: r2.obs}
        ]);
    }
    
    let diffIdaInt = sumVaIdaInt - sumVdIdaInt;
    let diffVueltaInt = sumVaVueltaInt - sumVdVueltaInt;
    let discrepanciaLineasInt = isCamuflaje ? (diffIdaInt + diffVueltaInt) : (diffIdaInt - diffVueltaInt);
    let discrepanciaLineas = fromScaledInt(discrepanciaLineasInt, decs);

    let cotaLlegadaInput = parseFloat(document.getElementById('cotaLlegada').value);
    let ptoInicioNombre = dataL1.length > 0 ? dataL1[0].pto : "";
    let ptoFinalNombre = dataL1.length > 0 ? dataL1[NLast].pto : "";
    let cotaRefFinal = dataL1.length > 1
        ? obtenerCotaOficialEstacion(ptoFinalNombre, NLast, NLast, cotaBM, cotaLlegadaInput, p, ptoInicioNombre)
        : NaN;

    let errorCierre = discrepanciaLineas;
    if (!isNaN(cotaRefFinal) && dataL1.length > 0 && dataL2.length > 0) {
        let promFinal = (fromScaledInt(dataL1[NLast].cotaInt, decs) + fromScaledInt(dataL2[NLast].cotaInt, decs)) / 2.0;
        errorCierre = promFinal - cotaRefFinal;
    }

    let distM = parseFloat(document.getElementById('distanciaM').value) || 0;
    let multiplicador = parseFloat(document.getElementById('ordenNiv').value) || 0.020;
    let tolerancia = multiplicador * Math.sqrt(distM / 1000);

    let isErrorAceptable = (Math.abs(errorCierre) <= tolerancia + 1e-7) && (Math.abs(discrepanciaLineas) <= tolerancia + 1e-7);
    let errorColor = isErrorAceptable ? "FF00C851" : "FFD32F2F"; 

    wsData.push([
        {v: "SUMAS", s: cellCenter}, 
        {v: fromScaledInt(sumVaIdaInt, decs), t: 'n', s: cellSum},
        {v: fromScaledInt(diffIdaInt, decs), t: 'n', s: cellSumDiff},
        {v: fromScaledInt(sumVdIdaInt, decs), t: 'n', s: cellSum},
        null, null, null,
        {v: isCamuflaje ? "ERR. I+V" : "DISC. L1/L2", s: cellCenter},
        {v: fromScaledInt(sumVaVueltaInt, decs), t: 'n', s: cellSum},
        {v: fromScaledInt(diffVueltaInt, decs), t: 'n', s: cellSumDiff},
        {v: fromScaledInt(sumVdVueltaInt, decs), t: 'n', s: cellSum},
        null, 
        {v: Number(discrepanciaLineas.toFixed(decs)), t: 'n', s: {fill: {fgColor: {rgb: errorColor}}, font: {bold: true, color: {rgb: "FFFFFFFF"}}, alignment: {horizontal: "center"}, numFmt: numFmtStr}}
    ]);

    if (!isNaN(cotaRefFinal) && dataL1.length > 0 && dataL2.length > 0) {
        let promFinal = (fromScaledInt(dataL1[NLast].cotaInt, decs) + fromScaledInt(dataL2[NLast].cotaInt, decs)) / 2.0;
        wsData.push([
            {v: "CIERRE BM", s: headIda},
            {v: "COTA OFICIAL:", s: cellCenter},
            {v: Number(cotaRefFinal.toFixed(decs)), t: 'n', s: cellCota},
            {v: "PROM. MEDIDO:", s: cellCenter},
            {v: Number(promFinal.toFixed(decs)), t: 'n', s: cellCota},
            {v: "ERROR VS BM:", s: cellCenter},
            null,
            {v: Number(errorCierre.toFixed(decs)), t: 'n', s: {fill: {fgColor: {rgb: errorColor}}, font: {bold: true, color: {rgb: "FFFFFFFF"}}, alignment: {horizontal: "center"}, numFmt: numFmtStr}},
            null, null, null, null, null
        ]);
    }

    // Agregar Cuadro Resumen de Cotas Compensadas debajo (calculándolo al vuelo si aún no estaba desplegado)
    let estacionesComp = calcularEstacionesCompensadas();
    let bmsComp = estacionesComp.filter(e => !e.esPC);
    if (bmsComp.length > 0) {
        wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, null]);
        wsData.push([
            {v: "PUNTO / BM", s: headIda},
            {v: isCamuflaje ? "COTA IDA" : "COTA L1", s: headIda},
            {v: isCamuflaje ? "COTA VUELTA" : "COTA L2", s: headIda},
            {v: "PROMEDIO", s: headIda},
            {v: "COTA COMPENSADA", s: headIda},
            null, null, null, null, null, null, null, null
        ]);
        bmsComp.forEach(item => {
            wsData.push([
                {v: item.pto, s: cellCenter},
                {v: Number(item.cotaIda.toFixed(decs)), t: 'n', s: cellCota},
                {v: Number(item.cotaVuelta.toFixed(decs)), t: 'n', s: cellCota},
                {v: Number(item.promCrudo.toFixed(decs)), t: 'n', s: cellCota},
                {v: Number(item.cotaCompensada.toFixed(decs)), t: 'n', s: cellSumDiff},
                null, null, null, null, null, null, null, null
            ]);
        });
    }
    
    let ws = XLSX.utils.aoa_to_sheet(wsData);
    if(!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({s: {r:0, c:0}, e: {r:0, c:12}}); 
    ws['!merges'].push({s: {r:6, c:0}, e: {r:6, c:5}}); 
    ws['!merges'].push({s: {r:6, c:7}, e: {r:6, c:12}}); 
    
    ws['!cols'] = [ {wch: 12}, {wch: 12}, {wch: 12}, {wch: 12}, {wch: 16}, {wch: 25}, {wch: 3}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 14} ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Nivelación");
    XLSX.writeFile(wb, `${p.nombre.replace(/\s+/g, '_')}_${isCamuflaje ? 'IdaVuelta' : 'Lineas'}.xlsx`);
    showToast("Reporte descargado", "success");
}

function toggleCalculadora() { const m = document.getElementById('calculadoraModal'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
function calcIn(v) { document.getElementById('calcDisplay').value += v; }
function calcClear() { document.getElementById('calcDisplay').value = ''; }
function calcDel() { let d = document.getElementById('calcDisplay'); d.value = d.value.slice(0, -1); }
function calcEval() {
    let decs = getDecs();
    try {
        let res = new Function('return ' + document.getElementById('calcDisplay').value)();
        document.getElementById('calcDisplay').value = (res % 1 !== 0) ? Number(res.toFixed(decs)) : res;
    } catch(e) {
        document.getElementById('calcDisplay').value = 'Error';
    }
}
