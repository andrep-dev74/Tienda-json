const productosEl = document.querySelector("#productos");
const listaCarritoEl = document.querySelector("#lista-carrito");
const carritoVacioEl = document.querySelector("#carrito-vacio");
const totalEl = document.querySelector("#total");
const vaciarBtn = document.querySelector("#vaciar-carrito");

let productos = [];
let carrito = JSON.parse(localStorage.getItem("pixel-carrito") || "[]");

async function iniciarTienda() {
  try {
    const respuesta = await fetch("productos.json");

    if (!respuesta.ok) {
      throw new Error("No se pudo cargar el catálogo.");
    }

    productos = await respuesta.json();
    mostrarProductos();
    mostrarCarrito();
  } catch (error) {
    productosEl.textContent =
      "No se pudo cargar el catálogo. Abre la tienda desde un servidor local.";
  }
}

function mostrarProductos() {
  productosEl.innerHTML = productos.map(producto => `
    <article class="producto">
      <div class="producto-icono" aria-hidden="true">${producto.icono}</div>
      <h3>${producto.nombre}</h3>
      <p>${producto.descripcion}</p>
      <p class="precio">${formatearPrecio(producto.precio)}</p>
      <button class="boton" data-agregar="${producto.id}">
        Agregar al carrito
      </button>
    </article>
  `).join("");
}

function agregarAlCarrito(id) {
  const producto = productos.find(item => item.id === id);
  if (!producto) return;

  const productoEnCarrito = carrito.find(item => item.id === id);

  if (productoEnCarrito) {
    productoEnCarrito.cantidad += 1;
  } else {
    carrito.push({ ...producto, cantidad: 1 });
  }

  guardarYActualizar();
}

function quitarDelCarrito(id) {
  carrito = carrito.filter(item => item.id !== id);
  guardarYActualizar();
}

function mostrarCarrito() {
  listaCarritoEl.innerHTML = carrito.map(item => `
    <li class="item-carrito">
      <span>
        ${item.nombre} × ${item.cantidad}
        <br>
        <small>${formatearPrecio(item.precio * item.cantidad)}</small>
      </span>
      <button data-quitar="${item.id}" aria-label="Quitar ${item.nombre}">
        Quitar
      </button>
    </li>
  `).join("");

  carritoVacioEl.hidden = carrito.length > 0;

  const total = carrito.reduce(
    (suma, item) => suma + item.precio * item.cantidad,
    0
  );

  totalEl.textContent = formatearPrecio(total);
}

function guardarYActualizar() {
  localStorage.setItem("pixel-carrito", JSON.stringify(carrito));
  mostrarCarrito();
}

function formatearPrecio(precio) {
  return new Intl.NumberFormat("es", {
    style: "currency",
    currency: "USD"
  }).format(precio);
}

productosEl.addEventListener("click", event => {
  const boton = event.target.closest("[data-agregar]");
  if (boton) agregarAlCarrito(Number(boton.dataset.agregar));
});

listaCarritoEl.addEventListener("click", event => {
  const boton = event.target.closest("[data-quitar]");
  if (boton) quitarDelCarrito(Number(boton.dataset.quitar));
});

vaciarBtn.addEventListener("click", () => {
  carrito = [];
  guardarYActualizar();
});

iniciarTienda();
