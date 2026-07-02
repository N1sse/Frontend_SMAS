/* ============================================================
   SafeMeal (SMAS) — app.js
   Lógica compartida por index.html y app.html
   ============================================================ */

const API_URL = "http://localhost:8080";

/* Caracteres especiales permitidos por el backend */
const REGEX_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[.,+?!*#$@%&()_\-={}\[\]:;<>/]).+$/;
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ============================================================
   Utilidades de red — maneja respuestas TEXTO y JSON
   ============================================================ */
async function parseRespuesta(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try { return await res.json(); } catch { return null; }
  }
  return await res.text();
}

async function apiFetch(ruta, opciones = {}) {
  const res = await fetch(`${API_URL}${ruta}`, {
    headers: { "Content-Type": "application/json" },
    ...opciones,
  });
  const data = await parseRespuesta(res);
  return { ok: res.ok, status: res.status, data };
}

/* ============================================================
   Sesión y roles
   ============================================================ */
const CLAVE_SESION = "safemeal_sesion";

function guardarSesion(usuario) {
  localStorage.setItem(CLAVE_SESION, JSON.stringify(usuario));
}
function obtenerSesion() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION)); }
  catch { return null; }
}
function cerrarSesion() {
  localStorage.removeItem(CLAVE_SESION);
  // Volver a la vista de login y recargar para limpiar el estado
  window.location.hash = "login";
  window.location.reload();
}
function haySesion() { return !!obtenerSesion(); }
function esEditor() {
  const s = obtenerSesion();
  return !!s && String(s.role).toLowerCase() === "editor";
}
function aplicarRolAlBody() {
  document.body.classList.remove("rol-editor", "rol-usuario");
  if (!haySesion()) return;
  document.body.classList.add(esEditor() ? "rol-editor" : "rol-usuario");
}

/* ============================================================
   Toasts y errores de campo
   ============================================================ */
function toast(mensaje, tipo = "exito", titulo = null) {
  const cont = document.getElementById("toastContenedor");
  if (!cont) { alert(mensaje); return; }
  const div = document.createElement("div");
  div.className = `toast ${tipo}`;

  let contenido = "";
  if (titulo) contenido += `<strong>${titulo}</strong>`;

  if (Array.isArray(mensaje)) {
    contenido += "<ul>" + mensaje.map(m => `<li>${m}</li>`).join("") + "</ul>";
  } else {
    contenido += `<span>${mensaje}</span>`;
  }
  div.innerHTML = contenido;
  cont.appendChild(div);
  setTimeout(() => { div.style.opacity = "0"; setTimeout(() => div.remove(), 300); }, 4200);
}

function marcarError(campoId, mensaje) {
  const input = document.getElementById(campoId);
  if (!input) return;
  const wrap = input.closest(".input-wrap");
  const msg = document.getElementById(`${campoId}-error`);
  input.classList.add("invalido");
  if (wrap) wrap.classList.add("error");
  if (msg) msg.textContent = mensaje;
}
function limpiarError(campoId) {
  const input = document.getElementById(campoId);
  if (!input) return;
  const wrap = input.closest(".input-wrap");
  const msg = document.getElementById(`${campoId}-error`);
  input.classList.remove("invalido");
  if (wrap) wrap.classList.remove("error");
  if (msg) msg.textContent = "";
}
function validarRequerido(campoId) {
  const input = document.getElementById(campoId);
  if (!input) return true;
  const campo = input.closest(".campo");
  if (!input.value.trim()) {
    if (campo) campo.classList.add("mostrar-alerta");
    return false;
  }
  if (campo) campo.classList.remove("mostrar-alerta");
  return true;
}

/* Limpia errores/alerta al escribir en cualquier campo */
function conectarLimpiezaCampos() {
  document.querySelectorAll("input, select").forEach(el => {
    const limpiar = () => {
      limpiarError(el.id);
      const campo = el.closest(".campo");
      if (campo) campo.classList.remove("mostrar-alerta");
    };
    el.addEventListener("input", limpiar);
    el.addEventListener("focus", limpiar);
  });
}

/* ============================================================
   Formato de fechas
   ============================================================ */
// input date entrega "yyyy-MM-dd" -> backend espera "dd-MM-yyyy"
function fechaISOaBackend(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}
// backend "dd-MM-yyyy" -> input date "yyyy-MM-dd"
function fechaBackendaISO(fecha) {
  if (!fecha) return "";
  if (fecha.includes("-") && fecha.split("-")[0].length === 4) return fecha; // ya ISO
  const [d, m, y] = fecha.split("-");
  return `${y}-${m}-${d}`;
}

/* ============================================================
   Validadores de contraseña (indicador en tiempo real)
   ============================================================ */
function evaluarPassword(valor) {
  return {
    longitud: valor.length >= 8 && valor.length <= 64,
    minuscula: /[a-z]/.test(valor),
    mayuscula: /[A-Z]/.test(valor),
    numero: /\d/.test(valor),
    especial: /[.,+?!*#$@%&()_\-={}\[\]:;<>/]/.test(valor),
  };
}
function conectarIndicadorPassword(inputId, listaId) {
  const input = document.getElementById(inputId);
  const lista = document.getElementById(listaId);
  if (!input || !lista) return;
  input.addEventListener("input", () => {
    const r = evaluarPassword(input.value);
    lista.querySelectorAll("li").forEach(li => {
      const req = li.dataset.req;
      const ok = r[req];
      li.classList.toggle("ok", ok);
      li.querySelector(".req-check").textContent = ok ? "✓" : "✗";
    });
  });
}

/* ============================================================
   INDEX (landing)
   ============================================================ */
function initLanding() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (toggle && links) {
    toggle.addEventListener("click", () => {
      const abierto = links.classList.toggle("abierto");
      toggle.setAttribute("aria-expanded", abierto);
    });
  }
  const formNews = document.getElementById("formNewsletter");
  if (formNews) {
    formNews.addEventListener("submit", (e) => {
      e.preventDefault();
      const email = document.getElementById("newsletterEmail").value.trim();
      if (!REGEX_EMAIL.test(email)) { alert("Ingresa un correo válido."); return; }
      alert("¡Gracias por suscribirte!");
      formNews.reset();
    });
  }
}

/* ============================================================
   APP interna — navegación de vistas
   ============================================================ */
const VISTAS = ["login", "registro", "perfil", "padecimientos", "alimentos", "recomendaciones"];

function mostrarVista(nombre) {
  const protegidas = ["perfil", "padecimientos", "alimentos", "recomendaciones"];
  if (protegidas.includes(nombre) && !haySesion()) nombre = "login";
  if ((nombre === "login" || nombre === "registro") && haySesion()) nombre = "recomendaciones";

  VISTAS.forEach(v => {
    const sec = document.getElementById(`vista-${v}`);
    if (sec) sec.hidden = (v !== nombre);
  });

  // topbar solo si hay sesión
  const topbar = document.getElementById("topbar");
  if (topbar) topbar.hidden = !haySesion();

  // marcar link activo
  document.querySelectorAll(".topbar-link").forEach(l => {
    l.classList.toggle("activo", l.dataset.vista === nombre);
  });

  // cargar datos según vista
  if (nombre === "padecimientos") cargarPadecimientos();
  if (nombre === "alimentos") { cargarSelectPadecimientos("filtroPadecimiento"); cargarAlimentos(); }
  if (nombre === "recomendaciones") cargarRecomendaciones();
  if (nombre === "perfil") cargarPerfil();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function irAVista(nombre) {
  window.location.hash = nombre;
  mostrarVista(nombre);
}

/* ============================================================
   AUTENTICACIÓN
   ============================================================ */
function initAuth() {
  // toggles de contraseña
  document.querySelectorAll(".toggle-pass").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      input.type = input.type === "password" ? "text" : "password";
    });
  });

  // enlaces cambio de vista
  document.querySelectorAll("[data-vista]").forEach(el => {
    if (el.tagName === "A" || el.classList.contains("topbar-link")) {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        irAVista(el.dataset.vista);
      });
    }
  });

  const btnSalir = document.getElementById("btnCerrarSesion");
  if (btnSalir) btnSalir.addEventListener("click", cerrarSesion);

  // toggle topbar móvil
  const tt = document.getElementById("topbarToggle");
  const tn = document.getElementById("topbarNav");
  if (tt && tn) {
    tt.addEventListener("click", () => {
      const abierto = tn.classList.toggle("abierto");
      tt.setAttribute("aria-expanded", abierto);
    });
  }

  // indicadores de contraseña
  conectarIndicadorPassword("reg-password", "reqPassword");
  conectarIndicadorPassword("perfil-password", "reqPasswordPerfil");

  // formularios
  const formLogin = document.getElementById("formLogin");
  if (formLogin) formLogin.addEventListener("submit", onLogin);
  const formRegistro = document.getElementById("formRegistro");
  if (formRegistro) formRegistro.addEventListener("submit", onRegistro);
  const formPerfil = document.getElementById("formPerfil");
  if (formPerfil) formPerfil.addEventListener("submit", onGuardarPerfil);
  const formPassword = document.getElementById("formPassword");
  if (formPassword) formPassword.addEventListener("submit", onCambiarPassword);
}

/* ---- LOGIN ---- */
async function onLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  let valido = true;
  if (!validarRequerido("login-email")) valido = false;
  if (!validarRequerido("login-password")) valido = false;
  if (!valido) return;

  if (!REGEX_EMAIL.test(email)) {
    marcarError("login-email", "Este correo electrónico es inválido.");
    return;
  }

  const { ok, data } = await apiFetch("/users/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  if (!ok) {
    // el backend responde texto plano o array de strings
    if (Array.isArray(data)) { toast(data, "error", "Error de validación"); }
    marcarError("login-email", typeof data === "string" ? data : "Correo o contraseña incorrectos.");
    return;
  }

  // login OK (texto plano). Buscamos el usuario por email para obtener id/role.
  const usuarios = await apiFetch("/users/all");
  let user = null;
  if (Array.isArray(usuarios.data)) {
    user = usuarios.data.find(u => (u.email || "").toLowerCase() === email.toLowerCase());
  }
  guardarSesion({
    id: user ? user.id : null,
    name: user ? user.name : email,
    email: email,
    role: user ? user.role : "usuario",
  });
  aplicarRolAlBody();
  toast("Ha iniciado sesión exitosamente.", "exito", "¡Bienvenido!");
  irAVista("recomendaciones");
}

/* ---- REGISTRO ---- */
async function onRegistro(e) {
  e.preventDefault();
  const campos = ["reg-name", "reg-gender", "reg-dateBirth", "reg-role", "reg-email", "reg-password"];
  let valido = true;
  campos.forEach(id => { if (!validarRequerido(id)) valido = false; });
  if (!valido) return;

  const name = document.getElementById("reg-name").value.trim();
  const gender = document.getElementById("reg-gender").value;
  const dateBirth = fechaISOaBackend(document.getElementById("reg-dateBirth").value);
  const role = document.getElementById("reg-role").value;
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;

  if (!REGEX_EMAIL.test(email)) { marcarError("reg-email", "Por favor, ingrese un correo electrónico válido."); return; }
  if (!REGEX_PASSWORD.test(password) || password.length < 8 || password.length > 64) {
    marcarError("reg-password", "La contraseña debe tener 8–64 caracteres con minúscula, mayúscula, número y carácter especial.");
    return;
  }

  const { ok, data } = await apiFetch("/users/add", {
    method: "POST",
    body: JSON.stringify({ name, gender, dateBirth, email, password, role }),
  });

  if (!ok) {
    if (Array.isArray(data)) toast(data, "error", "Corrige estos campos");
    else toast(data || "No se pudo registrar.", "error", "Error");
    return;
  }
  toast(data || "El usuario fue registrado de forma exitosa.", "exito", "Cuenta creada");
  document.getElementById("formRegistro").reset();
  irAVista("login");
}

/* ---- PERFIL ---- */
function cargarPerfil() {
  const s = obtenerSesion();
  if (!s) return;
  const setV = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  setV("perfil-name", s.name);
  setV("perfil-email", s.email);
  // si tenemos id, traemos datos frescos
  if (s.id != null) {
    apiFetch(`/users/${s.id}`).then(({ ok, data }) => {
      if (ok && data && typeof data === "object") {
        setV("perfil-name", data.name);
        setV("perfil-dateBirth", fechaBackendaISO(data.dateBirth));
      }
    });
  }
}

async function onGuardarPerfil(e) {
  e.preventDefault();
  const s = obtenerSesion();
  if (!s || s.id == null) { toast("No se pudo identificar tu usuario.", "error"); return; }

  if (!validarRequerido("perfil-name")) return;
  if (!validarRequerido("perfil-dateBirth")) return;

  const name = document.getElementById("perfil-name").value.trim();
  const dateBirth = fechaISOaBackend(document.getElementById("perfil-dateBirth").value);

  // el PUT requiere el objeto completo; recuperamos el actual y actualizamos
  const actual = await apiFetch(`/users/${s.id}`);
  const base = (actual.ok && typeof actual.data === "object") ? actual.data : s;

  const body = {
    name,
    gender: base.gender || "Otro",
    dateBirth,
    email: s.email,
    password: base.password || undefined,
    role: base.role || s.role,
  };

  const { ok, data } = await apiFetch(`/users/${s.id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });

  if (!ok) {
    if (Array.isArray(data)) toast(data, "error", "Corrige estos campos");
    else toast(data || "No se pudo actualizar.", "error", "Error");
    return;
  }
  guardarSesion({ ...s, name });
  toast("El usuario fue actualizado de forma exitosa.", "exito", "Perfil guardado");
}

async function onCambiarPassword(e) {
  e.preventDefault();
  const s = obtenerSesion();
  if (!s) return;
  if (!validarRequerido("perfil-password")) return;

  const password = document.getElementById("perfil-password").value;
  if (!REGEX_PASSWORD.test(password) || password.length < 8 || password.length > 64) {
    marcarError("perfil-password", "Debe tener 8–64 caracteres con minúscula, mayúscula, número y carácter especial.");
    return;
  }

  const { ok, data } = await apiFetch(`/users/change/${encodeURIComponent(s.email)}`, {
    method: "PATCH",
    body: JSON.stringify({ password }),
  });

  if (!ok) {
    if (Array.isArray(data)) toast(data, "error", "Corrige estos campos");
    else toast(data || "No se pudo cambiar la contraseña.", "error", "Error");
    return;
  }
  toast("Contraseña actualizada exitosamente.", "exito", "Listo");
  document.getElementById("formPassword").reset();
  document.querySelectorAll("#reqPasswordPerfil li").forEach(li => {
    li.classList.remove("ok"); li.querySelector(".req-check").textContent = "✗";
  });
}

/* ============================================================
   PADECIMIENTOS
   ============================================================ */
async function cargarPadecimientos() {
  const cont = document.getElementById("listaPadecimientos");
  if (!cont) return;
  cont.innerHTML = "<p class='gris'>Cargando…</p>";

  const { ok, status, data } = await apiFetch("/padecimientos/all");
  if (status === 204 || (ok && (!data || data.length === 0))) {
    cont.innerHTML = "<p class='gris'>No hay padecimientos registrados.</p>";
    return;
  }
  if (!Array.isArray(data)) { cont.innerHTML = "<p class='gris'>No se pudieron cargar.</p>"; return; }

  cont.innerHTML = "";
  data.forEach(p => {
    const card = document.createElement("article");
    card.className = "card-dato";
    card.innerHTML = `
      <h3>${p.nombre}</h3>
      <p>${p.descripcion || ""}</p>
      <div class="card-acciones solo-editor">
        <button class="btn btn-outline btn-sm" data-editar="${p.id}">Editar</button>
        <button class="btn btn-danger btn-sm" data-eliminar="${p.id}">Eliminar</button>
      </div>`;
    card.querySelector("[data-editar]")?.addEventListener("click", () => modalPadecimiento(p));
    card.querySelector("[data-eliminar]")?.addEventListener("click", () => eliminarPadecimiento(p.id));
    cont.appendChild(card);
  });
}

function modalPadecimiento(p = null) {
  if (!esEditor()) { toast("Solo un editor puede gestionar padecimientos.", "error"); return; }
  const esEdicion = !!p;
  abrirModal(esEdicion ? "Editar padecimiento" : "Nuevo padecimiento", `
    <form id="formModalPad" novalidate>
      <div class="campo">
        <label for="pad-nombre">Nombre (3–50)</label>
        <div class="input-wrap"><input id="pad-nombre" value="${p ? p.nombre : ""}" /></div>
        <p class="mensaje-error" id="pad-nombre-error"></p>
      </div>
      <div class="campo">
        <label for="pad-desc">Descripción (10–255)</label>
        <div class="input-wrap"><input id="pad-desc" value="${p ? (p.descripcion || "") : ""}" /></div>
        <p class="mensaje-error" id="pad-desc-error"></p>
      </div>
      <button type="submit" class="btn btn-primario btn-block">${esEdicion ? "Guardar" : "Crear"}</button>
    </form>
  `);

  document.getElementById("formModalPad").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("pad-nombre").value.trim();
    const descripcion = document.getElementById("pad-desc").value.trim();
    if (nombre.length < 3 || nombre.length > 50) { marcarError("pad-nombre", "El nombre debe tener entre 3 y 50 caracteres."); return; }
    if (descripcion.length < 10 || descripcion.length > 255) { marcarError("pad-desc", "La descripción debe tener entre 10 y 255 caracteres."); return; }

    const ruta = esEdicion ? `/padecimientos/${p.id}` : "/padecimientos/add";
    const metodo = esEdicion ? "PUT" : "POST";
    const { ok, data } = await apiFetch(ruta, { method: metodo, body: JSON.stringify({ nombre, descripcion }) });
    if (!ok) { toast(typeof data === "string" ? data : "No se pudo guardar.", "error", "Error"); return; }
    cerrarModal();
    toast(data || "Guardado con éxito.", "exito");
    cargarPadecimientos();
  });
}

async function eliminarPadecimiento(id) {
  if (!esEditor()) { toast("Solo un editor puede eliminar.", "error"); return; }
  if (!confirm("¿Eliminar este padecimiento?")) return;
  const { ok, data } = await apiFetch(`/padecimientos/${id}`, { method: "DELETE" });
  if (!ok) { toast("No se pudo eliminar.", "error"); return; }
  toast(data || "Eliminado.", "exito");
  cargarPadecimientos();
}

/* ============================================================
   ALIMENTOS
   ============================================================ */
async function cargarSelectPadecimientos(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  const { data } = await apiFetch("/padecimientos/all");
  const opcionesBase = selectId === "filtroPadecimiento"
    ? '<option value="">Todos</option>'
    : '<option value="">Selecciona…</option>';
  sel.innerHTML = opcionesBase;
  if (Array.isArray(data)) {
    data.forEach(p => {
      const o = document.createElement("option");
      o.value = p.id; o.textContent = p.nombre;
      sel.appendChild(o);
    });
  }
}

async function cargarAlimentos() {
  const cont = document.getElementById("listaAlimentos");
  if (!cont) return;
  cont.innerHTML = "<p class='gris'>Cargando…</p>";

  const filtro = document.getElementById("filtroPadecimiento")?.value;
  const ruta = filtro ? `/alimentos/porPadecimiento/${filtro}` : "/alimentos/all";
  const { ok, status, data } = await apiFetch(ruta);

  if (status === 204 || (ok && (!data || data.length === 0))) {
    cont.innerHTML = "<p class='gris'>No hay alimentos para mostrar.</p>";
    return;
  }
  if (!Array.isArray(data)) { cont.innerHTML = "<p class='gris'>No se pudieron cargar.</p>"; return; }

  cont.innerHTML = "";
  data.forEach(a => {
    const nivel = (a.nivelRecomendacion || "").toUpperCase();
    const badge = nivel === "RECOMENDADO" ? "badge-recomendado"
      : nivel === "PRECAUCION" ? "badge-precaucion" : "badge-evitar";
    const nivelTexto = nivel === "RECOMENDADO" ? "Recomendado"
      : nivel === "PRECAUCION" ? "Precaución" : "Evitar";
    const padNombre = a.padecimiento ? a.padecimiento.nombre : "";

    const card = document.createElement("article");
    card.className = "card-dato";
    card.innerHTML = `
      <span class="badge ${badge}">${nivelTexto}</span>
      <h3>${a.food}</h3>
      <p>${a.description || ""}</p>
      ${padNombre ? `<span class="card-meta">🩺 ${padNombre}</span>` : ""}
      <div class="card-acciones solo-editor">
        <button class="btn btn-outline btn-sm" data-editar>Editar</button>
        <button class="btn btn-danger btn-sm" data-eliminar>Eliminar</button>
      </div>`;
    card.querySelector("[data-editar]")?.addEventListener("click", () => modalAlimento(a));
    card.querySelector("[data-eliminar]")?.addEventListener("click", () => eliminarAlimento(a.id));
    cont.appendChild(card);
  });
}

async function modalAlimento(a = null) {
  if (!esEditor()) { toast("Solo un editor puede gestionar alimentos.", "error"); return; }
  const esEdicion = !!a;
  abrirModal(esEdicion ? "Editar alimento" : "Nuevo alimento", `
    <form id="formModalAli" novalidate>
      <div class="campo">
        <label for="ali-food">Alimento</label>
        <div class="input-wrap"><input id="ali-food" value="${a ? a.food : ""}" /></div>
        <p class="mensaje-error" id="ali-food-error"></p>
      </div>
      <div class="campo">
        <label for="ali-desc">Descripción</label>
        <div class="input-wrap"><input id="ali-desc" value="${a ? (a.description || "") : ""}" /></div>
        <p class="mensaje-error" id="ali-desc-error"></p>
      </div>
      <div class="campo">
        <label for="ali-nivel">Nivel de recomendación</label>
        <div class="input-wrap">
          <select id="ali-nivel">
            <option value="RECOMENDADO">Recomendado</option>
            <option value="PRECAUCION">Precaución</option>
            <option value="EVITAR">Evitar</option>
          </select>
        </div>
      </div>
      <div class="campo">
        <label for="ali-pad">Padecimiento</label>
        <div class="input-wrap"><select id="ali-pad"></select></div>
        <p class="mensaje-error" id="ali-pad-error"></p>
      </div>
      <button type="submit" class="btn btn-primario btn-block">${esEdicion ? "Guardar" : "Crear"}</button>
    </form>
  `);

  await cargarSelectPadecimientos("ali-pad");
  if (a) {
    if (a.nivelRecomendacion) document.getElementById("ali-nivel").value = a.nivelRecomendacion.toUpperCase();
    if (a.padecimiento) document.getElementById("ali-pad").value = a.padecimiento.id;
  }

  document.getElementById("formModalAli").addEventListener("submit", async (e) => {
    e.preventDefault();
    const food = document.getElementById("ali-food").value.trim();
    const description = document.getElementById("ali-desc").value.trim();
    const nivelRecomendacion = document.getElementById("ali-nivel").value;
    const padecimientoId = document.getElementById("ali-pad").value;

    if (!food) { marcarError("ali-food", "El alimento no puede quedar vacío."); return; }
    if (!description) { marcarError("ali-desc", "La descripción no puede quedar vacía."); return; }
    if (!padecimientoId) { marcarError("ali-pad", "Selecciona un padecimiento."); return; }

    const ruta = esEdicion ? `/alimentos/update/${a.id}` : "/alimentos/add";
    const metodo = esEdicion ? "PUT" : "POST";
    const { ok, data } = await apiFetch(ruta, {
      method: metodo,
      body: JSON.stringify({ padecimientoId: Number(padecimientoId), food, description, nivelRecomendacion }),
    });
    if (!ok) { toast(typeof data === "string" ? data : "No se pudo guardar.", "error", "Error"); return; }
    cerrarModal();
    toast(data || "Guardado con éxito.", "exito");
    cargarAlimentos();
  });
}

async function eliminarAlimento(id) {
  if (!esEditor()) { toast("Solo un editor puede eliminar.", "error"); return; }
  if (!confirm("¿Eliminar este alimento?")) return;
  const { ok, data } = await apiFetch(`/alimentos/deleted/${id}`, { method: "DELETE" });
  if (!ok) { toast("No se pudo eliminar.", "error"); return; }
  toast(data || "Eliminado.", "exito");
  cargarAlimentos();
}

/* ============================================================
   MIS PADECIMIENTOS (registro del usuario en planComidas)
   Relación tb-plancomidas: { user_id, padecimientos_id }
   ============================================================ */

// Devuelve la lista de planes (planComidas) del usuario actual
async function obtenerPlanesDelUsuario() {
  const s = obtenerSesion();
  if (!s || s.id == null) return [];
  const { ok, status, data } = await apiFetch("/planComidas/all");
  // 204 (sin contenido) o error => lista vacía
  if (!ok || status === 204 || !Array.isArray(data)) return [];
  // filtramos solo los del usuario en sesión
  return data.filter(pl => pl && pl.user && Number(pl.user.id) === Number(s.id));
}

// Pinta la lista "Mis padecimientos" en la vista de recomendaciones
async function cargarMisPadecimientos() {
  const cont = document.getElementById("misPadecimientos");
  if (!cont) return;
  cont.innerHTML = "<p class='gris'>Cargando…</p>";

  const planes = await obtenerPlanesDelUsuario();
  if (!planes.length) {
    cont.innerHTML = "<div class='mis-pad-vacio'>Aún no has registrado padecimientos. Usa el botón “Registrar padecimiento” para agregar el primero.</div>";
    return;
  }

  cont.innerHTML = "";
  planes.forEach(pl => {
    const p = pl.padecimientos || {};
    const item = document.createElement("div");
    item.className = "pad-item";
    item.innerHTML = `
      <div class="pad-item-info">
        <h4>${p.nombre || "Padecimiento"}</h4>
        <p>${p.descripcion || ""}</p>
      </div>
      <button class="btn-quitar" type="button" aria-label="Quitar padecimiento">Quitar</button>
    `;
    item.querySelector(".btn-quitar").addEventListener("click", () => quitarPadecimiento(pl.id, p.nombre));
    cont.appendChild(item);
  });
}

// Modal para que el usuario registre un padecimiento del catálogo
async function modalRegistrarPadecimiento() {
  const s = obtenerSesion();
  if (!s || s.id == null) { toast("Debes iniciar sesión.", "error"); return; }

  abrirModal("Registrar padecimiento", `
    <form id="formRegistrarPad" novalidate>
      <div class="campo" data-required>
        <label for="reg-pad-select">Selecciona un padecimiento</label>
        <select id="reg-pad-select" name="padecimiento" required>
          <option value="">Cargando…</option>
        </select>
        <span class="mensaje-error" id="reg-pad-select-error"></span>
      </div>
      <div class="modal-acciones">
        <button type="button" class="btn btn-outline" id="regPadCancelar">Cancelar</button>
        <button type="submit" class="btn btn-primario">Registrar</button>
      </div>
    </form>
  `);

  // llenar el select con el catálogo, excluyendo los ya registrados
  const sel = document.getElementById("reg-pad-select");
  const [{ data: catalogo }, planes] = await Promise.all([
    apiFetch("/padecimientos/all"),
    obtenerPlanesDelUsuario(),
  ]);
  const yaRegistrados = new Set(planes.map(pl => pl.padecimientos && Number(pl.padecimientos.id)));
  const disponibles = Array.isArray(catalogo)
    ? catalogo.filter(p => !yaRegistrados.has(Number(p.id)))
    : [];

  if (!disponibles.length) {
    sel.innerHTML = '<option value="">No hay padecimientos disponibles</option>';
  } else {
    sel.innerHTML = '<option value="">Selecciona…</option>';
    disponibles.forEach(p => {
      const o = document.createElement("option");
      o.value = p.id; o.textContent = p.nombre;
      sel.appendChild(o);
    });
  }

  document.getElementById("regPadCancelar").addEventListener("click", cerrarModal);

  document.getElementById("formRegistrarPad").addEventListener("submit", async (e) => {
    e.preventDefault();
    const padecimientoId = sel.value;
    if (!padecimientoId) { marcarError("reg-pad-select", "Selecciona un padecimiento."); return; }

    const { ok, data } = await apiFetch("/planComidas/add", {
      method: "POST",
      body: JSON.stringify({ userId: Number(s.id), padecimientoId: Number(padecimientoId) }),
    });

    if (!ok) {
      toast(typeof data === "string" ? data : "No se pudo registrar el padecimiento.", "error");
      return;
    }
    cerrarModal();
    toast("Padecimiento registrado con éxito.", "exito");
    // refrescar lista, chips y recomendaciones
    cargarRecomendaciones();
  });
}

// Quitar (eliminar) un padecimiento registrado por el usuario
async function quitarPadecimiento(planId, nombre) {
  if (planId == null) return;
  if (!confirm(`¿Quitar el padecimiento “${nombre || ""}” de tu lista?`)) return;

  const { ok, data } = await apiFetch(`/planComidas/deleted/${planId}`, { method: "DELETE" });
  if (!ok) {
    toast(typeof data === "string" ? data : "No se pudo quitar el padecimiento.", "error");
    return;
  }
  toast("Padecimiento eliminado de tu lista.", "exito");
  cargarRecomendaciones();
}

/* ============================================================
   RECOMENDACIONES
   ============================================================ */
async function cargarRecomendaciones() {
  const s = obtenerSesion();
  if (!s) return;

  // info del usuario
  document.getElementById("recoNombre").textContent = s.name || "—";
  document.getElementById("recoEmail").textContent = s.email || "—";
  document.getElementById("recoRol").textContent = esEditor() ? "Editor" : "Usuario";

  // cargar la lista de padecimientos registrados por el usuario
  cargarMisPadecimientos();

  const cols = {
    recomendados: document.getElementById("colRecomendados"),
    precaucion: document.getElementById("colPrecaucion"),
    evitar: document.getElementById("colEvitar"),
  };
  Object.values(cols).forEach(c => c.innerHTML = "<p class='vacio-nivel'>Cargando…</p>");

  if (s.id == null) {
    Object.values(cols).forEach(c => c.innerHTML = "<p class='vacio-nivel'>Sin datos de usuario.</p>");
    return;
  }

  const { ok, status, data } = await apiFetch(`/recomendaciones/${s.id}`);
  if (!ok || status === 404 || !data || typeof data !== "object") {
    Object.values(cols).forEach(c => c.innerHTML = "<p class='vacio-nivel'>Aún no hay recomendaciones.</p>");
    document.getElementById("recoPadecimientos").innerHTML = "<span class='gris'>Ninguno</span>";
    document.getElementById("listaPlatillos").innerHTML = "<p class='gris'>Sin platillos sugeridos.</p>";
    return;
  }

  // padecimientos en chips
  const chips = document.getElementById("recoPadecimientos");
  chips.innerHTML = "";
  (data.padecimientos || []).forEach(p => {
    const c = document.createElement("span"); c.className = "chip"; c.textContent = p; chips.appendChild(c);
  });
  if (!chips.children.length) chips.innerHTML = "<span class='gris'>Ninguno</span>";

  // alimentos por nivel
  pintarNivel(cols.recomendados, data.recomendados);
  pintarNivel(cols.precaucion, data.precaucion);
  pintarNivel(cols.evitar, data.evitar);

  // platillos
  const platCont = document.getElementById("listaPlatillos");
  platCont.innerHTML = "";
  (data.platillos || []).forEach(pl => {
    const div = document.createElement("div"); div.className = "platillo"; div.textContent = pl;
    platCont.appendChild(div);
  });
  if (!platCont.children.length) platCont.innerHTML = "<p class='gris'>Sin platillos sugeridos.</p>";
}

function pintarNivel(cont, lista) {
  cont.innerHTML = "";
  if (!Array.isArray(lista) || !lista.length) {
    cont.innerHTML = "<p class='vacio-nivel'>Sin elementos</p>";
    return;
  }
  lista.forEach(a => {
    const div = document.createElement("div");
    div.className = "item-alimento";
    div.innerHTML = `<strong>${a.nombre}</strong><p>${a.razon || ""}</p>`;
    cont.appendChild(div);
  });
}

/* ============================================================
   MODAL genérico
   ============================================================ */
function abrirModal(titulo, htmlBody) {
  document.getElementById("modalTitulo").textContent = titulo;
  document.getElementById("modalBody").innerHTML = htmlBody;
  document.getElementById("modalOverlay").hidden = false;
}
function cerrarModal() {
  const ov = document.getElementById("modalOverlay");
  if (ov) ov.hidden = true;
}
function initModal() {
  const ov = document.getElementById("modalOverlay");
  if (!ov) return;
  document.getElementById("modalCerrar").addEventListener("click", cerrarModal);
  ov.addEventListener("click", (e) => { if (e.target === ov) cerrarModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarModal(); });
}

/* ============================================================
   Botones "nuevo"
   ============================================================ */
function initBotonesNuevo() {
  document.getElementById("btnNuevoPadecimiento")?.addEventListener("click", () => modalPadecimiento());
  document.getElementById("btnNuevoAlimento")?.addEventListener("click", () => modalAlimento());
  document.getElementById("filtroPadecimiento")?.addEventListener("change", cargarAlimentos);
  document.getElementById("btnRegistrarPadecimiento")?.addEventListener("click", () => modalRegistrarPadecimiento());
}

/* ============================================================
   Constraint Validation nativa en español (respaldo)
   ============================================================ */
function initValidacionNativa() {
  document.querySelectorAll("input[required], select[required]").forEach(el => {
    el.addEventListener("invalid", (e) => e.target.setCustomValidity("Por favor, complete este campo."));
    el.addEventListener("input", (e) => e.target.setCustomValidity(""));
  });
}

/* ============================================================
   Arranque
   ============================================================ */
document.addEventListener("DOMContentLoaded", () => {
  if (document.body.classList.contains("pagina-landing")) {
    initLanding();
    return;
  }

  if (document.body.classList.contains("pagina-app")) {
    aplicarRolAlBody();
    initAuth();
    initModal();
    initBotonesNuevo();
    initValidacionNativa();
    conectarLimpiezaCampos();

    // vista inicial según hash
    let inicial = (window.location.hash || "").replace("#", "");
    if (!VISTAS.includes(inicial)) inicial = haySesion() ? "recomendaciones" : "login";
    mostrarVista(inicial);

    window.addEventListener("hashchange", () => {
      const v = (window.location.hash || "").replace("#", "");
      if (VISTAS.includes(v)) mostrarVista(v);
    });
  }
});
