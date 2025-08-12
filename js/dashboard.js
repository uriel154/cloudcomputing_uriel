// =============================
// Configuración Supabase
// =============================
const SUPABASE_URL = "https://cbubruvpcavyyhvtxjkl.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWJydXZwY2F2eXlodnR4amtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDM3NjAsImV4cCI6MjA3MDA3OTc2MH0.cnfhANKD3jw7HkeixMVTUnw3hSCjfCN55q8MkHNCW9E";
const client = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// =============================
// Función auxiliar para mostrar mensajes
// =============================
function showToast(msg, type = "info") {
  alert(`${type.toUpperCase()}: ${msg}`);
}

// =============================
// Agregar estudiante
// =============================
async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase = document.getElementById("clase").value.trim();

  if (!nombre || !correo || !clase) {
    showToast("Todos los campos son obligatorios.", "error");
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    showToast("No estás autenticado.", "error");
    return;
  }

  const { error } = await client.from("estudiantes").insert({
    nombre,
    correo,
    clase,
    user_id: user.id
  });

  if (error) {
    showToast("Error al agregar: " + error.message, "error");
  } else {
    showToast("Estudiante agregado ✅", "success");
    cargarEstudiantes();
  }
}

// =============================
// Cargar estudiantes
// =============================
async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    showToast("Error al cargar estudiantes: " + error.message, "error");
    return;
  }

  const lista = document.getElementById("lista-estudiantes");
  lista.innerHTML = "";
  data.forEach((est) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${est.nombre}</td>
      <td>${est.correo}</td>
      <td>${est.clase}</td>
      <td>
        <button onclick="editarEstudiante('${est.id}')">✏ Editar</button>
        <button onclick="eliminarEstudiante('${est.id}')">🗑 Eliminar</button>
      </td>
    `;
    lista.appendChild(row);
  });
}

// =============================
// Editar estudiante
// =============================
async function editarEstudiante(id) {
  const { data: estudiante, error } = await client
    .from("estudiantes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    showToast("Error al obtener datos: " + error.message, "error");
    return;
  }

  const nuevoNombre = prompt("Nuevo nombre:", estudiante.nombre)?.trim();
  const nuevoCorreo = prompt("Nuevo correo:", estudiante.correo)?.trim();
  const nuevaClase = prompt("Nueva clase:", estudiante.clase)?.trim();

  if (!nuevoNombre || !nuevoCorreo || !nuevaClase) {
    showToast("Todos los campos son obligatorios.", "error");
    return;
  }

  const { error: updateError } = await client
    .from("estudiantes")
    .update({ nombre: nuevoNombre, correo: nuevoCorreo, clase: nuevaClase })
    .eq("id", id);

  if (updateError) {
    showToast("Error al actualizar: " + updateError.message, "error");
  } else {
    showToast("Estudiante actualizado ✅", "success");
    cargarEstudiantes();
  }
}

// =============================
// Eliminar estudiante
// =============================
async function eliminarEstudiante(id) {
  if (!confirm("¿Seguro que quieres eliminar este estudiante?")) return;

  const { error } = await client.from("estudiantes").delete().eq("id", id);

  if (error) {
    showToast("Error al eliminar: " + error.message, "error");
  } else {
    showToast("Estudiante eliminado ✅", "success");
    cargarEstudiantes();
  }
}

// =============================
// Subir archivo
// =============================
async function subirArchivo() {
  const archivo = document.getElementById("archivo").files[0];
  if (!archivo) {
    showToast("Selecciona un archivo primero.", "error");
    return;
  }

  if (archivo.size > 5 * 1024 * 1024) {
    showToast("El archivo no debe superar los 5 MB.", "error");
    return;
  }

  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    showToast("Sesión no válida.", "error");
    return;
  }

  const nombreRuta = `${user.id}/${archivo.name}`;

  const { data: existentes } = await client.storage.from("tareas").list(user.id);
  if (existentes?.some(f => f.name === archivo.name)) {
    if (!confirm("Ya existe un archivo con ese nombre. ¿Deseas reemplazarlo?")) return;
  }

  const { error } = await client.storage
    .from("tareas")
    .upload(nombreRuta, archivo, { cacheControl: "3600", upsert: true });

  if (error) {
    showToast("Error al subir: " + error.message, "error");
  } else {
    showToast("Archivo subido correctamente ✅", "success");
    document.getElementById("archivo").value = "";
    listarArchivos();
  }
}

// =============================
// Listar archivos
// =============================
async function listarArchivos() {
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user) {
    showToast("Sesión no válida.", "error");
    return;
  }

  const { data, error } = await client.storage
    .from("tareas")
    .list(user.id, { limit: 20 });

  const lista = document.getElementById("lista-archivos");
  lista.innerHTML = "";

  if (error) {
    lista.innerHTML = "<li>Error al listar archivos</li>";
    return;
  }

  for (const archivo of data) {
    const { data: signedUrlData, error: signedUrlError } = await client.storage
      .from("tareas")
      .createSignedUrl(`${user.id}/${archivo.name}`, 60);

    if (signedUrlError) {
      console.error("Error al generar URL firmada:", signedUrlError.message);
      continue;
    }

    const publicUrl = signedUrlData.signedUrl;
    const item = document.createElement("li");

    if (/\.(jpg|jpeg|png|gif)$/i.test(archivo.name)) {
      item.innerHTML = `<strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">
          <img src="${publicUrl}" width="150" style="border:1px solid #ccc; margin:5px;" />
        </a>`;
    } else if (/\.pdf$/i.test(archivo.name)) {
      item.innerHTML = `<strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">Ver PDF</a>`;
    } else {
      item.innerHTML = `<a href="${publicUrl}" target="_blank">${archivo.name}</a>`;
    }

    lista.appendChild(item);
  }
}

// =============================
// Cerrar sesión
// =============================
async function cerrarSesion() {
  const { error } = await client.auth.signOut();
  if (error) {
    showToast("Error al cerrar sesión: " + error.message, "error");
  } else {
    localStorage.removeItem("token");
    showToast("Sesión cerrada ✅", "success");
    window.location.href = "index.html";
  }
}

// =============================
// Inicialización
// =============================
cargarEstudiantes();
listarArchivos();
