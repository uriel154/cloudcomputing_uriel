const SUPABASE_URL = "https://aplyqmgoinnerwbtyzmc.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNidWJydXZwY2F2eXlodnR4amtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1MDM3NjAsImV4cCI6MjA3MDA3OTc2MH0.cnfhANKD3jw7HkeixMVTUnw3hSCjfCN55q8MkHNCW9E";

const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function agregarEstudiante() {
  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const clase = document.getElementById("clase").value.trim();

  if (!nombre || !correo || !clase) {
    alert("Por favor completa todos los campos.");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    alert("No estás autenticado.");
    return;
  }

  const { error } = await client.from("estudiantes").insert({
    nombre,
    correo,
    clase,
    user_id: user.id,
  });

  if (error) {
    alert("Error al agregar: " + error.message);
  } else {
    alert("Estudiante agregado");
    cargarEstudiantes();
  }
}

async function cargarEstudiantes() {
  const { data, error } = await client
    .from("estudiantes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    alert("Error al cargar estudiantes: " + error.message);
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

// Editar estudiante
async function editarEstudiante(id) {
  const { data: estudiante, error } = await client
    .from("estudiantes")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert("Error al obtener datos: " + error.message);
    return;
  }

  const nuevoNombre = prompt("Nuevo nombre:", estudiante.nombre);
  const nuevoCorreo = prompt("Nuevo correo:", estudiante.correo);
  const nuevaClase = prompt("Nueva clase:", estudiante.clase);

  if (!nuevoNombre || !nuevoCorreo || !nuevaClase) {
    alert("Todos los campos son obligatorios.");
    return;
  }

  const { error: updateError } = await client
    .from("estudiantes")
    .update({
      nombre: nuevoNombre,
      correo: nuevoCorreo,
      clase: nuevaClase,
    })
    .eq("id", id);

  if (updateError) {
    alert("Error al actualizar: " + updateError.message);
  } else {
    alert("Estudiante actualizado ✅");
    cargarEstudiantes();
  }
}

// Eliminar estudiante
async function eliminarEstudiante(id) {
  if (!confirm("¿Seguro que quieres eliminar este estudiante?")) return;

  const { error } = await client
    .from("estudiantes")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Error al eliminar: " + error.message);
  } else {
    alert("Estudiante eliminado ✅");
    cargarEstudiantes();
  }
}

// Subir archivo
async function subirArchivo() {
  const archivoInput = document.getElementById("archivo");
  const archivo = archivoInput.files[0];

  if (!archivo) {
    alert("Selecciona un archivo primero.");
    return;
  }

  if (archivo.size > 5 * 1024 * 1024) {
    alert("El archivo no debe superar los 5 MB.");
    return;
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    alert("Sesión no válida.");
    return;
  }

  const nombreRuta = `${user.id}/${archivo.name}`;

  const { data: existentes } = await client.storage
    .from("tareas")
    .list(user.id);

  if (existentes?.some((f) => f.name === archivo.name)) {
    const reemplazar = confirm("Ya existe un archivo con ese nombre. ¿Deseas reemplazarlo?");
    if (!reemplazar) return;
  }

  const { error } = await client.storage
    .from("tareas")
    .upload(nombreRuta, archivo, {
      cacheControl: "3600",
      upsert: true,
    });

  if (error) {
    alert("Error al subir: " + error.message);
  } else {
    alert("Archivo subido correctamente ✅");
    archivoInput.value = ""; // limpiar input
    listarArchivos();
  }
}

async function listarArchivos() {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    alert("Sesión no válida.");
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

  // Usamos for...of para await
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

    const esImagen = archivo.name.match(/\.(jpg|jpeg|png|gif)$/i);
    const esPDF = archivo.name.match(/\.pdf$/i);

    if (esImagen) {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">
          <img src="${publicUrl}" width="150" style="border:1px solid #ccc; margin:5px;" />
        </a>
      `;
    } else if (esPDF) {
      item.innerHTML = `
        <strong>${archivo.name}</strong><br>
        <a href="${publicUrl}" target="_blank">Ver PDF</a>
      `;
    } else {
      item.innerHTML = `<a href="${publicUrl}" target="_blank">${archivo.name}</a>`;
    }

    lista.appendChild(item);
  }
}

async function cerrarSesion() {
  const { error } = await client.auth.signOut();

  if (error) {
    alert("Error al cerrar sesión: " + error.message);
  } else {
    localStorage.removeItem("token");
    alert("Sesión cerrada.");
    window.location.href = "index.html";
  }
}

cargarEstudiantes();
listarArchivos();