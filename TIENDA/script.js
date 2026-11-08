const productosEl = document.querySelector("#productos");
const filtrosEl = document.querySelector("#filtros-categoria");
const buscadorEl = document.querySelector("#buscador");
const ordenarEl = document.querySelector("#ordenar");
const modalEl = document.querySelector("#modal-cesta");
const listaCestaEl = document.querySelector("#lista-cesta");
const datosEnvioEl = document.querySelector("#datos-envio");
const cestaVaciaEl = document.querySelector("#cesta-vacia");
const totalEl = document.querySelector("#total");
const contadorEl = document.querySelector("#contador-cesta");
const toastEl = document.querySelector("#toast");

let productos = [];
let usuario = {};
let categoriaActual = "Todo";
let carrito = JSON.parse(localStorage.getItem("tienda-carrito") || "[]");

iniciar();

async function iniciar() {
  try {
    const [respuestaProductos, respuestaUsuario] = await Promise.all([
      fetch("./productos.json"),
      fetch("./userData.json")
    ]);

    if (!respuestaProductos.ok || !respuestaUsuario.ok) {
      throw new Error("No se pudieron cargar los archivos JSON.");
    }

    productos = await respuestaProductos.json();
    usuario = await respuestaUsuario.json();

    // Conserva solo productos que siguen existiendo y tienen stock.
    carrito = carrito.filter(item =>
      productos.some(producto => producto.id === item.id && producto.stock > 0)
    );

    dibujarFiltros();
    dibujarProductos();
    actualizarCesta();
  } catch (error) {
    productosEl.innerHTML =
      '<p class="mensaje">No se pudieron cargar los datos. Comprueba que los archivos JSON estén en la carpeta y abre la página desde un servidor local.</p>';
    console.error(error);
  }
}

function dibujarFiltros() {
  const categorias = [
    "Todo",
    ...new Set(
      productos
        .filter(producto => producto.stock > 0)
        .map(producto => producto.category)
    )
  ];

  filtrosEl.innerHTML = categorias.map(categoria => `
    <button
      class="boton-filtro ${categoria === categoriaActual ? "activo" : ""}"
      data-categoria="${escaparHTML(categoria)}"
    >
      ${escaparHTML(categoria)}
    </button>
  `).join("");
}

function dibujarProductos() {
  const texto = buscadorEl.value.trim().toLowerCase();

  let lista = productos.filter(producto => {
    const tieneStock = producto.stock > 0;
    const coincideCategoria =
      categoriaActual === "Todo" || producto.category === categoriaActual;
    const coincideTexto =
      producto.name.toLowerCase().includes(texto) ||
      producto.description.toLowerCase().includes(texto);

    return tieneStock && coincideCategoria && coincideTexto;
  });

  switch (ordenarEl.value) {
    case "precio-asc":
      lista.sort((a, b) => a.price - b.price);
      break;
    case "precio-desc":
      lista.sort((a, b) => b.price - a.price);
      break;
    case "nombre":
      lista.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "stock":
      lista.sort((a, b) => b.stock - a.stock);
      break;
  }

  if (lista.length === 0) {
    productosEl.innerHTML = '<p class="mensaje">No se encontraron productos.</p>';
    return;
  }

  productosEl.innerHTML = lista.map(producto => `
    <article class="producto">
      <h3>${escaparHTML(producto.name)}</h3>
      <p>${escaparHTML(producto.description)}</p>
      <p class="precio">${formatearPrecio(producto.price)}</p>
      <small>Stock: ${producto.stock}</small>
      <button class="boton" data-agregar="${producto.id}">
        Añadir a la cesta
      </button>
    </article>
  `).join("");
}

function agregarProducto(id) {
  const producto = productos.find(item => item.id === id);
  if (!producto || producto.stock < 1) return;

  const item = carrito.find(item => item.id === id);
  const cantidadActual = item ? item.quantity : 0;

  if (cantidadActual >= producto.stock) {
    mostrarToast("No hay más unidades disponibles.");
    return;
  }

  if (item) {
    item.quantity += 1;
  } else {
    carrito.push({ id: producto.id, quantity: 1 });
  }

  guardarCarrito();
  mostrarToast(`${producto.name} añadido`);
}

function cambiarCantidad(id, cambio) {
  const item = carrito.find(item => item.id === id);
  const producto = productos.find(producto => producto.id === id);
  if (!item || !producto) return;

  const nuevaCantidad = item.quantity + cambio;

  if (nuevaCantidad <= 0) {
    eliminarProducto(id);
    return;
  }

  if (nuevaCantidad > producto.stock) {
    mostrarToast("No hay más unidades disponibles.");
    return;
  }

  item.quantity = nuevaCantidad;
  guardarCarrito();
}

function eliminarProducto(id) {
  carrito = carrito.filter(item => item.id !== id);
  guardarCarrito();
}

function actualizarCesta() {
  const unidades = carrito.reduce((suma, item) => suma + item.quantity, 0);
  contadorEl.textContent = unidades;

  listaCestaEl.innerHTML = carrito.map(item => {
    const producto = productos.find(producto => producto.id === item.id);
    if (!producto) return "";

    return `
      <li class="item-cesta">
        <span>
          ${escaparHTML(producto.name)}
          <br>
          <small>${formatearPrecio(producto.price * item.quantity)}</small>
        </span>
        <div class="controles-cantidad">
          <button data-cambio="-1" data-id="${producto.id}" aria-label="Reducir cantidad">−</button>
          <span>${item.quantity}</span>
          <button data-cambio="1" data-id="${producto.id}" aria-label="Aumentar cantidad">+</button>
        </div>
        <button class="eliminar" data-eliminar="${producto.id}">Eliminar</button>
      </li>
    `;
  }).join("");

  cestaVaciaEl.hidden = carrito.length > 0;

  const total = carrito.reduce((suma, item) => {
    const producto = productos.find(producto => producto.id === item.id);
    return suma + (producto ? producto.price * item.quantity : 0);
  }, 0);

  totalEl.textContent = formatearPrecio(total);
}

function guardarCarrito() {
  localStorage.setItem("tienda-carrito", JSON.stringify(carrito));
  actualizarCesta();
}

function abrirCesta() {
  datosEnvioEl.textContent =
    `Enviando pedido a: ${usuario.name}, ${usuario.address}`;
  actualizarCesta();
  modalEl.hidden = false;
}

function mostrarToast(mensaje) {
  toastEl.textContent = mensaje;
  toastEl.classList.add("visible");

  clearTimeout(mostrarToast.temporizador);
  mostrarToast.temporizador = setTimeout(() => {
    toastEl.classList.remove("visible");
  }, 3000);
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR"
  }).format(precio);
}

function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, caracter => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[caracter]);
}

filtrosEl.addEventListener("click", event => {
  const boton = event.target.closest("[data-categoria]");
  if (!boton) return;

  categoriaActual = boton.dataset.categoria;
  dibujarFiltros();
  dibujarProductos();
});

productosEl.addEventListener("click", event => {
  const boton = event.target.closest("[data-agregar]");
  if (boton) agregarProducto(Number(boton.dataset.agregar));
});

buscadorEl.addEventListener("input", dibujarProductos);
ordenarEl.addEventListener("change", dibujarProductos);

document.querySelector("#ver-cesta").addEventListener("click", abrirCesta);
document.querySelector("#cerrar-modal").addEventListener("click", () => {
  modalEl.hidden = true;
});

modalEl.addEventListener("click", event => {
  if (event.target === modalEl) modalEl.hidden = true;
});

listaCestaEl.addEventListener("click", event => {
  const botonCantidad = event.target.closest("[data-cambio]");
  const botonEliminar = event.target.closest("[data-eliminar]");

  if (botonCantidad) {
    cambiarCantidad(
      Number(botonCantidad.dataset.id),
      Number(botonCantidad.dataset.cambio)
    );
  }

  if (botonEliminar) {
    eliminarProducto(Number(botonEliminar.dataset.eliminar));
  }
});

document.querySelector("#finalizar-compra").addEventListener("click", () => {
  carrito = [];
  guardarCarrito();
  modalEl.hidden = true;
  mostrarToast("Compra finalizada. ¡Gracias!");
});
