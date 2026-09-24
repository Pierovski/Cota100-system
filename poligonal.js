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

/* --- FUNCIONES GLOBALES --- */
function vibrar() {
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
}

// Bloqueador absoluto de 3 decimales
function formatDecimal(input) {
    let val = input.value.replace(/,/g, '.');
    val = val.replace(/[^0-9.-]/g, ''); 
    if (val.indexOf('-') > 0) val = val.replace(/-/g, '');
    if ((val.match(/-/g) || []).length > 1) val = '-' + val.replace(/-/g, '');
    let parts = val.split('.');
    if (parts.length > 2) val = parts[0] + '.' + parts.slice(1).join('');
    // Bloqueamos a 3 decimales estrictamente
    if (parts.length === 2 && parts[1].length > 3) {
        val = parts[0] + '.' + parts[1].substring(0, 3);
    }
    if(input.value !== val) input.value = val;
}

// Autocompletar ceros al quitar el foco (Ej: 1.6 -> 1.600)
function completarCeros(input) {
    validarLecturaFisica(input);
    let val = input.value.trim();
    if (val === "" || val === "-" || val === ".") return;
    let floatVal = parseFloat(val);
    if (!isNaN(floatVal)) {
        input.value = floatVal.toFixed(3);
        guardarBD();
    }
}

// Validación Topográfica (Máximo 5.000m para miras de aluminio)
function validarLecturaFisica(input) {
    if(!input.classList.contains('in-va') && !input.classList.contains('in-vd')) return;
    let val = parseFloat(input.value);
    if (!isNaN(val) && val > 5.000) {
        input.classList.add('input-error');
        showToast("Lectura mayor a 5 metros. Verifica tu mira.", "error");
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
            <div><strong style="color:var(--primary-color);">Independencia:</strong> En Pata de Gallo, ambas líneas avanzan. Las lecturas de L1 y L2 son totalmente independientes; solo se sincroniza el nombre de la estación.</div>
        </div>
        <div style="display:flex; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
            <span style="font-size:1.2rem; margin-right:10px;">⚠️</span> 
            <div><strong style="color:var(--primary-color);">HUD Δ PC:</strong> El error milimétrico por armada se calcula con la diferencia entre la V.AD (L1-L2) y la V.AT (L1-L2) del mismo PC. Si el alarife mueve la placa, esto explotará en rojo.</div>
        </div>
        <div style="display:flex; align-items:flex-start; margin-bottom:12px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">
            <span style="font-size:1.2rem; margin-right:10px;">📍</span> 
            <div><strong style="color:var(--primary-color);">Límites de Mira:</strong> El sistema asume miras de aluminio estándar. Cualquier lectura superior a 5.000 metros bloqueará la celda en rojo.</div>
        </div>
        <div style="display:flex; align-items:flex-start;">
            <span style="font-size:1.2rem; margin-right:10px;">📊</span> 
            <div><strong style="color:var(--primary-color);">Exportación:</strong> Genera reportes en Excel (Real o Camuflado) o exporta puntos limpios a CSV para Civil 3D.</div>
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

/* --- MODAL PRUEBA DE 2 ESTACAS --- */
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
    let a1 = parseFloat(document.getElementById('peA1').value);
    let b1 = parseFloat(document.getElementById('peB1').value);
    let a2 = parseFloat(document.getElementById('peA2').value);
    let b2 = parseFloat(document.getElementById('peB2').value);
    
    let resDiv = document.getElementById('resPrueba');
    if(!isNaN(a1) && !isNaN(b1) && !isNaN(a2) && !isNaN(b2)) {
        let delta1 = a1 - b1; 
        let delta2 = a2 - b2; 
        let error = delta2 - delta1;
        let errorMM = error * 1000;
        
        let color = Math.abs(errorMM) <= 3 ? 'var(--success-text)' : 'var(--danger-color)';
        let signo = errorMM > 0 ? '+' : '';
        resDiv.innerHTML = `<span style="font-size:0.8rem; display:block; color:var(--text-color);">Error de Colimación (e):</span><span style="color:${color}; font-size:1.8rem; letter-spacing:1px;">${signo}${errorMM.toFixed(1)} mm</span>`;
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

/* --- UI: MODAL SELECTOR GENÉRICO --- */
let tipoModalActual = "";

function abrirModalSelect(tipo) {
    tipoModalActual = tipo;
    const titulo = document.getElementById('modalSelectTitle');
    const contenido = document.getElementById('modalSelectContent');
    const extra = document.getElementById('modalSelectExtra');
    contenido.innerHTML = ""; extra.innerHTML = "";
    
    let p = obtenerProyectoActivo();

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
        let decs = parseInt(globalConfig.decimales) || 3;
        p.bms.forEach(bm => {
            contenido.innerHTML += `<button class="btn-opcion" onclick="seleccionarOpcionModal('${bm.nombre}', '')">
                <span>${bm.nombre}</span>
                <span class="cota">Cota: ${bm.cota.toFixed(decs)}</span>
            </button>`;
        });
        extra.innerHTML = `<button class="btn-accion" style="background:var(--table-header); color:#fff; font-size:1.1rem; padding:15px; margin-top:10px;" onclick="activarTecladoManual()">⌨️ TECLADO MANUAL</button>`;
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
    let p = obtenerProyectoActivo();
    
    const finalizarGuardado = () => {
        document.getElementById('newBMName').value = ""; document.getElementById('newBMCota').value = ""; document.getElementById('newBMObs').value = "";
        guardarBD(); renderBMs(); showToast("BM guardado", "success");
    };

    if(editandoBMIndex > -1) {
        showCustomConfirm("⚠️ ¿Actualizar los datos de este BM?", () => {
            let oldName = p.bms[editandoBMIndex].nombre;
            if(p.bms.some((bm, i) => bm.nombre === name && i !== editandoBMIndex)) return showToast("⚠️ Ya existe otro BM con ese nombre.", "warning");
            p.bms[editandoBMIndex] = { nombre: name, cota: cota, obs: obs };

            let trIda0 = document.getElementById('cuerpoIda').children[0];
            if (trIda0) {
                let inPto = trIda0.querySelector('.in-pto');
                if (inPto.dataset.bmAsignado === oldName) {
                    inPto.dataset.bmAsignado = name; inPto.value = name;
                    document.getElementById('cotaBM').value = cota.toFixed(parseInt(globalConfig.decimales) || 3);
                    procesarDobleLiga();
                }
            }
            editandoBMIndex = -1; let btn = document.getElementById('btnGuardarBM'); btn.innerText = "Guardar BM en Proyecto"; btn.style.background = "var(--table-header)";
            guardarBD(); finalizarGuardado();
        });
    } else {
        if(p.bms.some(bm => bm.nombre === name)) return showToast("Ya existe un BM con ese nombre.", "warning");
        p.bms.push({ nombre: name, cota: cota, obs: obs }); finalizarGuardado();
    }
}

function cargarEditBM(i) {
    let p = obtenerProyectoActivo(); let bm = p.bms[i];
    document.getElementById('newBMName').value = bm.nombre; document.getElementById('newBMCota').value = bm.cota; document.getElementById('newBMObs').value = bm.obs || "";
    editandoBMIndex = i; let btn = document.getElementById('btnGuardarBM'); btn.innerText = "Actualizar BM"; btn.style.background = "var(--primary-color)";
}

function deleteBM(i) { 
    let p = obtenerProyectoActivo();
    showCustomConfirm(`⚠️ ¿Eliminar BM "${p.bms[i].nombre}"?`, () => { p.bms.splice(i, 1); guardarBD(); renderBMs(); showToast("BM eliminado", "success"); });
}

function renderBMs() {
    let decs = parseInt(globalConfig.decimales) || 3; let p = obtenerProyectoActivo(); const list = document.getElementById('listaBMs'); list.innerHTML = ""; 
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
    const val = input.value.toUpperCase(); input.value = val; 
    let decs = parseInt(globalConfig.decimales) || 3; let p = obtenerProyectoActivo(); const bmEncontrado = p.bms.find(b => b.nombre === val);
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

function agregarFila(isAuto = false, scrollDown = false) {
    if(tablaBloqueada) return; 
    const tbodyIda = document.getElementById('cuerpoIda'); const tbodyVuelta = document.getElementById('cuerpoVuelta');
    const idx = tbodyIda.children.length; 
    
    const trIda = document.createElement('tr');
    if (idx === 0) {
        trIda.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto bm-selector" placeholder="BM..." readonly onclick="abrirSelectorBM(this)"></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)"></td>
            <td class="td-readonly"><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" disabled></td>
            <td class="out-cota" style="padding: 2px;">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"></td>`;
    } else {
        trIda.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto" placeholder="Pto..." oninput="this.value = this.value.toUpperCase(); syncBM(this); procesarDobleLiga(); guardarBD();"></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)"></td>
            <td><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)"></td>
            <td class="out-cota">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"><button class="btn-del-fila" onclick="borrarFilaEspecifica(this)">✖</button></td>`;
    }
    
    const trVuelta = document.createElement('tr');
    if (idx === 0) {
        trVuelta.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto" placeholder="..." readonly></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)"></td>
            <td class="td-readonly"><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" disabled></td>
            <td class="out-cota" style="padding: 2px;">---</td>
            <td style="background: rgba(128,128,128,0.02); padding: 0;"></td>`;
    } else {
        trVuelta.innerHTML = `<td class="sticky-col"><input type="text" class="in-pto" placeholder="..." readonly></td>
            <td><input type="text" inputmode="decimal" class="in-va" placeholder="(+)" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)"></td>
            <td><input type="text" inputmode="decimal" class="in-vd" placeholder="[-]" oninput="formatDecimal(this); syncBM(this); procesarDobleLiga();" onblur="completarCeros(this)"></td>
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

function procesarDobleLiga() {
    let decs = parseInt(globalConfig.decimales) || 3;
    let cotaBM = parseFloat(document.getElementById('cotaBM').value); let distM = parseFloat(document.getElementById('distanciaM').value);
    let tolTramoMM = parseFloat(document.getElementById('tolTramo').value) || 2; let multiplicador = parseFloat(document.getElementById('ordenNiv').value);

    let filasIda = document.querySelectorAll('#cuerpoIda tr'); let filasVuelta = document.querySelectorAll('#cuerpoVuelta tr');
    if(filasIda.length === 0) return;

    procesarAutoNombrar();

    let cotaActIda = 0; let aiIda = 0; let cotaActVuelta = 0; let aiVuelta = 0; let habilitarSiguiente = true; 

    for(let i=0; i<filasIda.length; i++) {
        
        if (habilitarSiguiente) { filasIda[i].classList.remove('fila-inactiva'); filasVuelta[i].classList.remove('fila-inactiva'); } 
        else {
            filasIda[i].classList.add('fila-inactiva'); filasVuelta[i].classList.add('fila-inactiva');
            filasIda[i].querySelector('.out-cota').innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`;
            filasVuelta[i].querySelector('.out-cota').innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`;
            filasIda[i].style.boxShadow = "none"; filasVuelta[i].style.backgroundColor = "transparent";
            continue; 
        }

        let vaIda = parseFloat(filasIda[i].querySelector('.in-va').value); let vdIda = parseFloat(filasIda[i].querySelector('.in-vd').value);
        let vaVuelta = parseFloat(filasVuelta[i].querySelector('.in-va').value); let vdVuelta = parseFloat(filasVuelta[i].querySelector('.in-vd').value);
        
        let celdaIda = filasIda[i].querySelector('.out-cota'); let celdaVuelta = filasVuelta[i].querySelector('.out-cota');
        let badgeInvisible = `<div class="badge-tramo badge-oculto">_</div>`;

        let agresteIda = (!isNaN(vaIda) && !isNaN(vdIda) && Math.abs(vaIda - vdIda) > 2.50);
        if(agresteIda) {
            filasIda[i].style.boxShadow = "inset 0 0 0 2px #fbc02d";
            filasIda[i].title = "Riesgo de visual corta en siguiente armada";
        } else {
            filasIda[i].style.boxShadow = "none";
            filasIda[i].title = "";
        }

        // --- CÁLCULO DE COTAS LÍNEA 1 (IZQ) ---
        if (i === 0) {
            cotaActIda = isNaN(cotaBM) ? NaN : cotaBM;
            if (!isNaN(cotaActIda)) {
                if (!isNaN(vaIda)) { aiIda = cotaActIda + vaIda; celdaIda.innerHTML = `<div style="font-size:0.75rem; color:#1976d2;">AI: ${aiIda.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActIda}">${cotaActIda.toFixed(decs)}</div>${badgeInvisible}`; } 
                else { celdaIda.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActIda}">${cotaActIda.toFixed(decs)}</div>${badgeInvisible}`; }
            } else { celdaIda.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>${badgeInvisible}`; }
        } else {
            if (!isNaN(vdIda)) {
                cotaActIda = aiIda - vdIda;
                if (!isNaN(vaIda)) { aiIda = cotaActIda + vaIda; celdaIda.innerHTML = `<div style="font-size:0.75rem; color:#1976d2;">AI: ${aiIda.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActIda}">${cotaActIda.toFixed(decs)}</div>${badgeInvisible}`; } 
                else { celdaIda.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActIda}">${cotaActIda.toFixed(decs)}</div>${badgeInvisible}`; }
            } else { celdaIda.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>${badgeInvisible}`; }
        }

        // --- CÁLCULO DE COTAS Y HUD DE ERROR - LÍNEA 2 (DER) ---
        let hudHTML = '';
        let isPC = filasIda[i].querySelector('.in-pto').value.toUpperCase().startsWith("PC");

        if (i === 0) {
            cotaActVuelta = isNaN(cotaBM) ? NaN : cotaBM;
            if (!isNaN(vaIda) && !isNaN(vaVuelta)) {
                let errorMM = Math.abs(vaIda - vaVuelta) * 1000;
                let pct = tolTramoMM > 0 ? (errorMM / tolTramoMM) * 100 : 0;
                let st = getErrorHUDStyles(pct);
                let alert = pct > 100 ? ' ⚠️' : '';
                hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:${st.c}; background:${st.b}; border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Δ Arranque: ${errorMM.toFixed(1)}mm | ${pct.toFixed(0)}%${alert}</div>`;
                filasVuelta[i].style.backgroundColor = pct > 100 ? 'rgba(211,47,47,0.05)' : 'transparent';
            }
            if (!isNaN(cotaActVuelta)) {
                if (!isNaN(vaVuelta)) { 
                    aiVuelta = cotaActVuelta + vaVuelta; 
                    celdaVuelta.innerHTML = `<div style="font-size:0.75rem; color:var(--corte-color);">AI: ${aiVuelta.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActVuelta}">${cotaActVuelta.toFixed(decs)}</div>${hudHTML}`; 
                } 
                else { celdaVuelta.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActVuelta}">${cotaActVuelta.toFixed(decs)}</div>${hudHTML}`; }
            } else { celdaVuelta.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`; }
        } else {
            if (!isNaN(vdVuelta)) {
                cotaActVuelta = aiVuelta - vdVuelta;
                if (!isNaN(vaVuelta)) aiVuelta = cotaActVuelta + vaVuelta;

                if (isPC) {
                    if (!isNaN(vdIda) && !isNaN(vdVuelta) && !isNaN(vaIda) && !isNaN(vaVuelta)) {
                        let diffVD = vdIda - vdVuelta;
                        let diffVA = vaIda - vaVuelta;
                        let errorMM = Math.abs(diffVD - diffVA) * 1000;
                        let pct = tolTramoMM > 0 ? (errorMM / tolTramoMM) * 100 : 0;
                        let st = getErrorHUDStyles(pct);
                        let alert = pct > 100 ? ' ⚠️' : '';
                        hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:${st.c}; background:${st.b}; border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Δ PC: ${errorMM.toFixed(1)}mm | ${pct.toFixed(0)}%${alert}</div>`;
                        filasVuelta[i].style.backgroundColor = pct > 100 ? 'rgba(211,47,47,0.05)' : 'transparent';
                    } else if (!isNaN(vdIda) && !isNaN(vdVuelta)) {
                        let diffVD = Math.abs(vdIda - vdVuelta) * 1000;
                        hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:#1976d2; background:rgba(25,118,210,0.1); border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Dif. Lectura: ${diffVD.toFixed(1)}mm</div>`;
                        filasVuelta[i].style.backgroundColor = 'transparent';
                    }
                } else {
                    if (!isNaN(vdIda) && !isNaN(vdVuelta)) {
                        let errorMM = Math.abs(cotaActIda - cotaActVuelta) * 1000;
                        let pct = tolTramoMM > 0 ? (errorMM / tolTramoMM) * 100 : 0;
                        let st = getErrorHUDStyles(pct);
                        let alert = pct > 100 ? ' ⚠️' : '';
                        hudHTML = `<div style="font-size:0.75rem; font-weight:900; color:${st.c}; background:${st.b}; border-radius:4px; padding:2px 4px; display:inline-block; margin-top:2px; letter-spacing:0.5px;">Δ Cierre: ${errorMM.toFixed(1)}mm | ${pct.toFixed(0)}%${alert}</div>`;
                        filasVuelta[i].style.backgroundColor = pct > 100 ? 'rgba(211,47,47,0.05)' : 'transparent';
                    }
                }

                if (!isNaN(vaVuelta)) {
                    celdaVuelta.innerHTML = `<div style="font-size:0.75rem; color:var(--corte-color);">AI: ${aiVuelta.toFixed(decs)}</div><div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActVuelta}">${cotaActVuelta.toFixed(decs)}</div>${hudHTML}`;
                } else {
                    celdaVuelta.innerHTML = `<div style="font-size:1.05rem; font-weight:900;" data-cota="${cotaActVuelta}">${cotaActVuelta.toFixed(decs)}</div>${hudHTML}`;
                }
            } else { celdaVuelta.innerHTML = `<div style="color:var(--text-color); opacity:0.5;">---</div>`; }
        }

        if (i === 0) { if (isNaN(vaIda) || isNaN(vaVuelta) || isNaN(cotaBM)) habilitarSiguiente = false; } 
        else { if (isNaN(vaIda) || isNaN(vdIda) || isNaN(vaVuelta) || isNaN(vdVuelta)) habilitarSiguiente = false; }
    }

    document.getElementById('contenedorCompensadas').style.display = 'none';

    if(!isNaN(cotaBM) && !isNaN(distM) && distM > 0 && filasIda.length > 0) {
        let anchors = []; let filledRows = 0;
        for(let i=0; i<filasIda.length; i++) {
            if (filasIda[i].classList.contains('fila-inactiva')) continue;
            let pto = filasIda[i].querySelector('.in-pto').value.trim().toUpperCase();
            if(pto !== "") { filledRows++; if(!pto.startsWith("PC")) anchors.push(i); }
        }

        let ultimoLleno = -1;
        for(let i = filasIda.length - 1; i >= 0; i--) {
            if (filasIda[i].classList.contains('fila-inactiva')) continue;
            if(filasIda[i].querySelector('.in-pto').value.trim() !== "") { ultimoLleno = i; break; }
        }
        if(ultimoLleno > anchors[anchors.length - 1]) anchors.push(ultimoLleno);

        let htmlSeg = ""; let todosCumplen = true;

        if(anchors.length > 1) {
            let distPerSetup = distM / (filledRows > 1 ? filledRows - 1 : 1);

            for(let k=0; k<anchors.length-1; k++) {
                let start = anchors[k]; let end = anchors[k+1];
                let ptoStart = filasIda[start].querySelector('.in-pto').value.toUpperCase(); let ptoEnd = filasIda[end].querySelector('.in-pto').value.toUpperCase();

                let divIda = filasIda[end].querySelector('.out-cota div[data-cota]'); let cotaIdaEnd = divIda ? parseFloat(divIda.getAttribute('data-cota')) : NaN;
                let divVuelta = filasVuelta[end].querySelector('.out-cota div[data-cota]'); let cotaVueltaEnd = divVuelta ? parseFloat(divVuelta.getAttribute('data-cota')) : NaN;

                if(!isNaN(cotaIdaEnd) && !isNaN(cotaVueltaEnd)) {
                    let errTramo = Math.abs(cotaIdaEnd - cotaVueltaEnd); let setups = end - start; let distTramo = setups * distPerSetup;
                    let tolTramo = multiplicador * Math.sqrt(distTramo / 1000); let cumple = errTramo <= tolTramo;
                    if(!cumple) todosCumplen = false;

                    let bgCumple = document.body.classList.contains('dark-mode') ? 'rgba(46,125,50,0.1)' : '#f1f8e9'; let bgFalla = document.body.classList.contains('dark-mode') ? 'rgba(211,47,47,0.1)' : '#ffebee';
                    let borderCumple = document.body.classList.contains('dark-mode') ? 'var(--success-color)' : '#a5d6a7'; let borderFalla = document.body.classList.contains('dark-mode') ? 'var(--danger-color)' : '#ef9a9a';

                    htmlSeg += `
                        <div style="border: 2px solid ${cumple ? borderCumple : borderFalla}; border-radius: 6px; padding: 10px; margin-bottom: 10px; text-align: left; background: ${cumple ? bgCumple : bgFalla};">
                            <div style="font-weight: 900; color: var(--text-color); margin-bottom: 5px;">📍 ${ptoStart} ➔ ${ptoEnd} <span style="float:right; font-size:0.8rem; opacity:0.8;">(${setups} armadas)</span></div>
                            <div style="display: flex; justify-content: space-between; font-size: 0.95rem; color: var(--text-color); opacity: 0.9;">
                                <span>Error (L1 vs L2): <strong>${errTramo.toFixed(4)} m</strong></span>
                                <span>Tol: <strong>±${tolTramo.toFixed(4)} m</strong></span>
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        document.getElementById('contenedorSegmentos').innerHTML = htmlSeg;
        
        let distKm = distM / 1000; 
        let cotaLlegadaInput = parseFloat(document.getElementById('cotaLlegada').value);
        let toleranciaGlobal = multiplicador * Math.sqrt(distKm);
        let errorCierreGlobal = 0;

        if(!isNaN(cotaLlegadaInput)) {
            let promedioFinal = (cotaActIda + cotaActVuelta) / 2;
            errorCierreGlobal = Math.abs(promedioFinal - cotaLlegadaInput);
        } else {
            errorCierreGlobal = Math.abs(cotaActIda - cotaActVuelta); 
        }

        document.getElementById('resError').innerText = errorCierreGlobal.toFixed(4) + " m"; document.getElementById('resTol').innerText = "±" + toleranciaGlobal.toFixed(4) + " m";

        let estadoTag = document.getElementById('resEstado');
        if(errorCierreGlobal <= toleranciaGlobal && todosCumplen) {
            estadoTag.innerText = "✓ CUMPLE ESPECIFICACIONES"; estadoTag.className = "estado-cumple";
            document.getElementById('btnCompensar').style.display = 'block';
        } else {
            estadoTag.innerText = "❌ RECHAZADO (REVISAR TRAMOS)"; estadoTag.className = "estado-falla";
            document.getElementById('btnCompensar').style.display = 'none';
        }
        document.getElementById('panelResultados').style.display = 'block';
    } else {
        document.getElementById('panelResultados').style.display = 'none';
    }
}

// NUEVA COMPENSACIÓN (5 COLUMNAS VISUALES)
function generarCompensadas() {
    let decs = parseInt(globalConfig.decimales) || 3;
    const cotaBM = parseFloat(document.getElementById('cotaBM').value);
    const cotaLlegadaInput = parseFloat(document.getElementById('cotaLlegada').value);
    
    const filasIda = document.querySelectorAll('#cuerpoIda tr'); 
    const filasVuelta = document.querySelectorAll('#cuerpoVuelta tr');
    
    // Inyectamos las 5 cabeceras para garantizar la visibilidad total
    const tablaCompensada = document.getElementById('tablaCompensada');
    tablaCompensada.querySelector('thead').innerHTML = `<tr><th>PUNTO</th><th>COTA L1</th><th>COTA L2</th><th>PROMEDIO</th><th>COMPENSADA</th></tr>`;
    
    const cuerpoCompensadas = document.getElementById('cuerpoCompensadas'); 
    cuerpoCompensadas.innerHTML = "";

    let datosEstaciones = [];
    for(let i = 0; i < filasIda.length; i++) {
        if (filasIda[i].classList.contains('fila-inactiva')) continue;
        let pto = filasIda[i].querySelector('.in-pto').value.toUpperCase().trim(); if (!pto) continue;
        let cotaIda = NaN, cotaVuelta = NaN;
        
        if (i === 0) { 
            cotaIda = isNaN(cotaBM) ? NaN : cotaBM; 
            cotaVuelta = isNaN(cotaBM) ? NaN : cotaBM; 
        } else {
            let divCotaIda = filasIda[i].querySelector('.out-cota div[data-cota]'); if (divCotaIda) cotaIda = parseFloat(divCotaIda.getAttribute('data-cota'));
            let divCotaVuelta = filasVuelta[i].querySelector('.out-cota div[data-cota]'); if (divCotaVuelta) cotaVuelta = parseFloat(divCotaVuelta.getAttribute('data-cota'));
        }

        if (!isNaN(cotaIda) && !isNaN(cotaVuelta)) { datosEstaciones.push({ pto: pto, cotaIda: cotaIda, cotaVuelta: cotaVuelta, esPC: pto.startsWith("PC") }); }
    }

    if (datosEstaciones.length < 2) return;
    let N = datosEstaciones.length - 1; 
    
    let esCircuitoCerrado = (datosEstaciones[0].pto === datosEstaciones[N].pto);
    let tieneCotaLlegada = !isNaN(cotaLlegadaInput);
    let cotaReferenciaFinal = NaN;

    if (esCircuitoCerrado) {
        cotaReferenciaFinal = datosEstaciones[0].cotaIda;
    } else if (tieneCotaLlegada) {
        cotaReferenciaFinal = cotaLlegadaInput;
    }

    let errorCierreOficial = 0;
    if (!isNaN(cotaReferenciaFinal)) {
        let promedioFinalCrudo = (datosEstaciones[N].cotaIda + datosEstaciones[N].cotaVuelta) / 2;
        errorCierreOficial = promedioFinalCrudo - cotaReferenciaFinal;
    }

    for (let i = 0; i <= N; i++) {
        let data = datosEstaciones[i]; 
        let factorProporcional = i / N; 
        
        let promedioCrudo = (data.cotaIda + data.cotaVuelta) / 2;
        let cotaCompensadaFinal = promedioCrudo;

        if (!isNaN(cotaReferenciaFinal)) {
            cotaCompensadaFinal = promedioCrudo - (errorCierreOficial * factorProporcional);
        }

        if (!data.esPC) {
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--primary-color); font-weight: 900;">${data.pto}</td>
                <td>${data.cotaIda.toFixed(decs)}</td>
                <td>${data.cotaVuelta.toFixed(decs)}</td>
                <td style="color:#1976d2; font-weight: 700;">${promedioCrudo.toFixed(decs)}</td>
                <td style="color:var(--success-text); font-weight: 900; background: rgba(46,125,50,0.05);">${cotaCompensadaFinal.toFixed(decs)}</td>
            `;
            cuerpoCompensadas.appendChild(tr);
        }
    }

    document.getElementById('contenedorCompensadas').style.display = 'block';
    setTimeout(() => { document.getElementById('contenedorCompensadas').scrollIntoView({ behavior: 'smooth', block: 'end' }); }, 100);
    showToast("Cotas compensadas rigurosamente", "success");
}

function exportarCSVparaCivil3D() {
    cerrarModalSelect();
    let compRows = document.querySelectorAll('#cuerpoCompensadas tr');
    if(compRows.length === 0) return showToast("Primero debes obtener cotas compensadas.", "warning");
    
    let decs = parseInt(globalConfig.decimales) || 3;
    let csvContent = "Punto,Norte,Este,Elevacion,Descripcion\n";
    let ptoCount = 1;

    compRows.forEach(tr => {
        let tds = tr.querySelectorAll('td');
        let ptoStr = tds[0].innerText.trim();
        // Extracción desde la 5ta columna (Compensada) que es el índice 4
        let elevStr = parseFloat(tds[4].innerText).toFixed(decs);
        csvContent += `${ptoCount},1000.000,1000.000,${elevStr},${ptoStr}\n`;
        ptoCount++;
    });

    let p = obtenerProyectoActivo();
    let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    let url = URL.createObjectURL(blob);
    let link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${p.nombre.replace(/\s+/g, '_')}_Civil3D.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("CSV generado para Civil 3D", "success");
}

/* --- EL MOTOR DE EXPORTACIÓN MAESTRO (EXCEL) --- */
function exportarExcelPlantilla(modo) {
    cerrarModalSelect();
    let p = obtenerProyectoActivo();
    let decs = parseInt(globalConfig.decimales) || 3;
    let wb = XLSX.utils.book_new();
    
    let isCamuflaje = (modo === 'ida_vuelta');
    let tituloRep = isCamuflaje ? "NIVELACIÓN IDA Y VUELTA" : "NIVELACIÓN LÍNEAS GEMELAS (PATA DE GALLO)";
    let titL1 = isCamuflaje ? "IDA" : "LÍNEA 1 (IZQ)";
    let titL2 = isCamuflaje ? "VUELTA" : "LÍNEA 2 (DER)";
    
    let styleTit = { fill: { fgColor: { rgb: "FF000000" } }, font: { bold: true, sz: 14, color: { rgb: "FFDDAA00" } }, alignment: { horizontal: "center", vertical: "center" } };
    let headIda = { fill: { fgColor: { rgb: "FFFFA000" } }, font: { bold: true, color: {rgb: "FF000000"} }, alignment: { horizontal: "center", vertical: "center" } };
    let headVuelta = { fill: { fgColor: { rgb: "FFFFA000" } }, font: { bold: true, color: {rgb: "FF000000"} }, alignment: { horizontal: "center", vertical: "center" } };
    
    let cellCenter = { alignment: { horizontal: "center", vertical: "center" } };
    let cellDec = { alignment: { horizontal: "center", vertical: "center" }, numFmt: "0.000" };
    let cellCota = { alignment: { horizontal: "center", vertical: "center" }, numFmt: "0.000" };
    
    let cellSum = { fill: { fgColor: { rgb: "FFFFA000" } }, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, numFmt: "0.000" };
    let cellSumDiff = { fill: { fgColor: { rgb: "FFFFD54F" } }, font: { bold: true }, alignment: { horizontal: "center", vertical: "center" }, numFmt: "0.000" };

    let wsData = [];
    wsData.push([{v: tituloRep, s: styleTit}, null, null, null, null, null, null, null, null, null, null, null, null]);
    wsData.push([null, null, null, null, null, null, null, null, null, null, null, null, null]);
    
    let fechaActual = new Date().toISOString().split('T')[0];
    wsData.push([{v: "PROYECTO    :"}, {v: p.nombre}, null, null, {v: "FECHA         :"}, {v: fechaActual}, null, null, null, null, null, null, null]);
    wsData.push([{v: "TOPOGRAFO :"}, {v: "COTA100"}, null, null, null, null, null, null, null, null, null, null, null]);
    
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
    let ai1 = 0, cota1 = cotaBM; let ai2 = 0, cota2 = cotaBM;

    for (let i = 0; i < filasIda.length; i++) {
        if (filasIda[i].classList.contains('fila-inactiva')) continue;
        let pto = filasIda[i].querySelector('.in-pto').value || ""; if (!pto) continue;
        
        let va1 = parseFloat(filasIda[i].querySelector('.in-va').value);
        let vd1 = parseFloat(filasIda[i].querySelector('.in-vd').value);
        let va2 = parseFloat(filasVuelta[i].querySelector('.in-va').value);
        let vd2 = parseFloat(filasVuelta[i].querySelector('.in-vd').value);
        
        let bmObj = p.bms.find(b => b.nombre === pto);
        let obs1 = bmObj ? (bmObj.obs || "") : "";
        
        if (i === 0) {
            cota1 = cotaBM; cota2 = cotaBM;
            ai1 = cota1 + va1; ai2 = cota2 + va2;
            dataL1.push({ pto, va: va1, ai: ai1, vd: NaN, cota: cota1, obs: obs1 });
            dataL2.push({ pto, va: va2, ai: ai2, vd: NaN, cota: cota2, obs: obs1 });
        } else {
            cota1 = ai1 - vd1; cota2 = ai2 - vd2;
            let currentAi1 = isNaN(va1) ? NaN : (cota1 + va1);
            let currentAi2 = isNaN(va2) ? NaN : (cota2 + va2);
            dataL1.push({ pto, va: va1, ai: currentAi1, vd: vd1, cota: cota1, obs: obs1 });
            dataL2.push({ pto, va: va2, ai: currentAi2, vd: vd2, cota: cota2, obs: obs1 });
            ai1 = currentAi1; ai2 = currentAi2;
        }
    }
    
    let exportL2 = [];
    if (isCamuflaje && dataL2.length > 0) {
        let N = dataL2.length - 1;
        let cotaRetorno = dataL2[N].cota; 
        let currentAiRet = 0;
        let pcCount = 1;
        
        for (let i = 0; i <= N; i++) {
            let src = N - i; 
            let ptoNombre = "";
            if (i === 0) ptoNombre = dataL1[N].pto; 
            else if (i === N) ptoNombre = dataL1[0].pto; 
            else { ptoNombre = "PC-" + pcCount; pcCount++; } 
            
            if (i === 0) {
                let vaRet = dataL2[src].vd; currentAiRet = cotaRetorno + vaRet;
                exportL2.push({ pto: ptoNombre, va: vaRet, ai: currentAiRet, vd: NaN, cota: cotaRetorno, obs: dataL2[src].obs });
            } else if (i === N) {
                let vdRet = dataL2[src].va; let cotaLlegadaRet = currentAiRet - vdRet;
                exportL2.push({ pto: ptoNombre, va: NaN, ai: NaN, vd: vdRet, cota: cotaLlegadaRet, obs: dataL2[src].obs });
            } else {
                let vaRet = dataL2[src].vd; let vdRet = dataL2[src].va;
                let cotaIntermedia = currentAiRet - vdRet; currentAiRet = cotaIntermedia + vaRet;
                exportL2.push({ pto: ptoNombre, va: vaRet, ai: currentAiRet, vd: vdRet, cota: cotaIntermedia, obs: dataL2[src].obs });
            }
        }
    } else { exportL2 = dataL2; }
    
    let sumVaIda = 0, sumVdIda = 0, sumVaVuelta = 0, sumVdVuelta = 0;
    
    let rowCount = Math.max(dataL1.length, exportL2.length);
    for (let i = 0; i < rowCount; i++) {
        let r1 = dataL1[i] || {pto:"", va:NaN, ai:NaN, vd:NaN, cota:NaN, obs:""};
        let r2 = exportL2[i] || {pto:"", va:NaN, ai:NaN, vd:NaN, cota:NaN, obs:""};
        
        if(!isNaN(r1.va)) sumVaIda += r1.va; if(!isNaN(r1.vd)) sumVdIda += r1.vd;
        if(!isNaN(r2.va)) sumVaVuelta += r2.va; if(!isNaN(r2.vd)) sumVdVuelta += r2.vd;
        
        wsData.push([
            {v: r1.pto, s: cellCenter}, 
            isNaN(r1.va) ? {v: ""} : {v: Number(r1.va.toFixed(decs)), t: 'n', s: cellDec},
            isNaN(r1.ai) ? {v: "-"} : {v: Number(r1.ai.toFixed(decs)), t: 'n', s: cellDec},
            isNaN(r1.vd) ? {v: ""} : {v: Number(r1.vd.toFixed(decs)), t: 'n', s: cellDec},
            isNaN(r1.cota) ? {v: ""} : {v: Number(r1.cota.toFixed(decs)), t: 'n', s: cellCota},
            {v: r1.obs}, null, 
            {v: r2.pto, s: cellCenter}, 
            isNaN(r2.va) ? {v: ""} : {v: Number(r2.va.toFixed(decs)), t: 'n', s: cellDec},
            isNaN(r2.ai) ? {v: "-"} : {v: Number(r2.ai.toFixed(decs)), t: 'n', s: cellDec},
            isNaN(r2.vd) ? {v: ""} : {v: Number(r2.vd.toFixed(decs)), t: 'n', s: cellDec},
            isNaN(r2.cota) ? {v: ""} : {v: Number(r2.cota.toFixed(decs)), t: 'n', s: cellCota},
            {v: r2.obs}
        ]);
    }
    
    // Sumatorias y Cálculo de Error
    let diffIda = sumVaIda - sumVdIda;
    let diffVuelta = sumVaVuelta - sumVdVuelta;
    let errorCierre = diffIda + diffVuelta; 

    let distM = parseFloat(document.getElementById('distanciaM').value) || 0;
    let multiplicador = parseFloat(document.getElementById('ordenNiv').value) || 0.020;
    let tolerancia = multiplicador * Math.sqrt(distM / 1000);

    let isErrorAceptable = Math.abs(errorCierre) <= tolerancia;
    let errorColor = isErrorAceptable ? "FF00C851" : "FFD32F2F"; 

    wsData.push([
        null, 
        {v: sumVaIda, t: 'n', s: cellSum}, {v: diffIda, t: 'n', s: cellSumDiff}, {v: sumVdIda, t: 'n', s: cellSum}, null, null, null,
        null,
        {v: sumVaVuelta, t: 'n', s: cellSum}, {v: diffVuelta, t: 'n', s: cellSumDiff}, {v: sumVdVuelta, t: 'n', s: cellSum}, null, 
        {v: errorCierre, t: 'n', s: {fill: {fgColor: {rgb: errorColor}}, font: {bold: true, color: {rgb: "FFFFFFFF"}}, alignment: {horizontal: "center"}, border: {top:{style:'medium', color:{rgb:"FF000000"}}, bottom:{style:'medium', color:{rgb:"FF000000"}}, left:{style:'medium', color:{rgb:"FF000000"}}, right:{style:'medium', color:{rgb:"FF000000"}}}, numFmt: "0.000"}}
    ]);
    
    let ws = XLSX.utils.aoa_to_sheet(wsData);
    if(!ws['!merges']) ws['!merges'] = [];
    ws['!merges'].push({s: {r:0, c:0}, e: {r:0, c:12}}); 
    ws['!merges'].push({s: {r:6, c:0}, e: {r:6, c:5}}); 
    ws['!merges'].push({s: {r:6, c:7}, e: {r:6, c:12}}); 
    
    ws['!cols'] = [ {wch: 10}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 25}, {wch: 3}, {wch: 10}, {wch: 10}, {wch: 12}, {wch: 10}, {wch: 12}, {wch: 12} ];
    
    XLSX.utils.book_append_sheet(wb, ws, "Nivelación");
    XLSX.writeFile(wb, `${p.nombre.replace(/\s+/g, '_')}_${isCamuflaje ? 'IdaVuelta' : 'Lineas'}.xlsx`);
    showToast("Reporte descargado", "success");
}

function toggleCalculadora() { const m = document.getElementById('calculadoraModal'); m.style.display = m.style.display === 'block' ? 'none' : 'block'; }
function calcIn(v) { document.getElementById('calcDisplay').value += v; }
function calcClear() { document.getElementById('calcDisplay').value = ''; }
function calcDel() { let d = document.getElementById('calcDisplay'); d.value = d.value.slice(0, -1); }
function calcEval() { try { let res = new Function('return ' + document.getElementById('calcDisplay').value)(); document.getElementById('calcDisplay').value = (res % 1 !== 0) ? res.toFixed(3) : res; } catch(e) { document.getElementById('calcDisplay').value = 'Error'; } }
