import { mostrarToast, limpiarBackdrops, mostrarModalConfirmacionProfesional } from './helpers.js';

let productosGlobal = [];
let categoriasGlobal = [];
let unidadesMedidaGlobal = [];
let eventosInicializados = false;
let elementos = {};
let confirmacionCallback = null;
let productoActualId = null;
let imagenesSeleccionadas = [];
let imagenesAEliminar = [];

let galeriaImagenes = [];
let galeriaIndex = 0;

function generarCodigoBarras() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const aleatorio = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FER${año}${mes}${dia}${aleatorio}`;
}

function generarImagenCodigo(codigo) {
    if (!codigo) return;
    const url = `https://barcode.tec-it.com/barcode.ashx?data=${codigo}&code=Code128&dpi=96`;
    const img = document.getElementById('codigoBarrasImg');
    const preview = document.getElementById('codigoBarrasPreview');
    const btnImprimir = document.getElementById('btnImprimirCodigo');
    
    if (img) {
        img.src = url;
        preview.style.display = 'block';
        if (btnImprimir) {
            const newBtn = btnImprimir.cloneNode(true);
            btnImprimir.parentNode.replaceChild(newBtn, btnImprimir);
            
            newBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                const win = window.open('', '_blank');
                win.document.write(`
                    <html>
                        <head><title>Imprimir Código de Barras</title>
                        <style>body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}img{max-width:300px;}@media print{body{margin:0;}img{max-width:100%;}}</style>
                        </head>
                        <body onload="window.print();window.close();">
                            <img src="${url}" alt="Código de barras">
                        </body>
                    </html>
                `);
                win.focus();
            };
        }
    }
}

function isCurrentPage() {
    return document.getElementById('tablaProductos') !== null;
}

function getElement(id) {
    if (!elementos[id]) {
        elementos[id] = document.getElementById(id);
    }
    return elementos[id];
}


function limpiarFormulario() {
    const form = getElement('formProducto');
    if (form) form.reset();
    
    getElement('productoId').value = '';
    getElement('codigo_barras').value = '';
    getElement('tituloModalProducto').textContent = 'Nuevo Producto';
    
    const preview = document.getElementById('previsualizacionProducto');
    if (preview) {
        preview.innerHTML = '<div class="text-muted small w-100 text-center py-3">No hay imágenes seleccionadas</div>';
    }
    
    const inputImagenes = document.getElementById('inputImagenesProducto');
    if (inputImagenes) inputImagenes.value = '';
    
    imagenesSeleccionadas = [];
    imagenesAEliminar = [];
    
    const codigoPreview = document.getElementById('codigoBarrasPreview');
    if (codigoPreview) codigoPreview.style.display = 'none';
    
    const codigoInput = getElement('codigo_barras');
    const btnGenerar = document.getElementById('btnGenerarCodigo');
    if (codigoInput) codigoInput.disabled = false;
    if (btnGenerar) {
        btnGenerar.style.display = 'inline-block';
        btnGenerar.className = 'btn btn-primary';
    }
}


function actualizarPrevisualizacionCompleta() {
    const preview = document.getElementById('previsualizacionProducto');
    if (!preview) return;
    
    preview.innerHTML = '';
    
    if (imagenesSeleccionadas.length === 0) {
        preview.innerHTML = '<div class="text-muted small w-100 text-center py-3">No hay imágenes seleccionadas</div>';
        return;
    }
    
    imagenesSeleccionadas.forEach((file, idx) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            preview.innerHTML += `
                <div class="position-relative d-inline-block" style="width: 80px; height: 80px; margin: 5px;">
                    <img src="${ev.target.result}" style="width: 100%; height: 100%; object-fit: contain; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <button type="button" class="btn-close bg-danger rounded-circle" 
                            style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background-size: 8px; cursor: pointer; opacity: 0.9; border: none;"
                            data-name="${file.name}" aria-label="Eliminar"></button>
                </div>
            `;
        };
        reader.readAsDataURL(file);
    });
    
    setTimeout(() => {
        document.querySelectorAll('#previsualizacionProducto .btn-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileName = btn.dataset.name;
                const index = imagenesSeleccionadas.findIndex(f => f.name === fileName);
                if (index !== -1) {
                    imagenesSeleccionadas.splice(index, 1);
                    actualizarPrevisualizacionCompleta();
                    mostrarToast('Imagen eliminada de la selección', 'info');
                }
            });
        });
    }, 100);
}


function setupPrevisualizacionImagenes() {
    const inputImagenes = document.getElementById('inputImagenesProducto');
    const preview = document.getElementById('previsualizacionProducto');
    
    if (!inputImagenes || !preview) return;
    
    inputImagenes.multiple = true;
    inputImagenes.addEventListener('change', () => {
        const files = Array.from(inputImagenes.files);
        
        if (imagenesSeleccionadas.length + files.length > 10) {
            mostrarToast('Máximo 10 imágenes por producto', 'warning');
            inputImagenes.value = '';
            return;
        }
        
        imagenesSeleccionadas.push(...files);
        actualizarPrevisualizacionCompleta();
        inputImagenes.value = '';
        
        if (files.length > 0) {
            mostrarToast(`${files.length} imagen(es) seleccionada(s)`, 'success');
        }
    });
}

function obtenerImagenPrincipal(producto) {
    if (producto.imagenes && producto.imagenes.length > 0) {
        const principal = producto.imagenes.find(img => img.principal === 1);
        if (principal && principal.nombre_archivo) return principal.nombre_archivo;
        if (producto.imagenes[0] && producto.imagenes[0].nombre_archivo) return producto.imagenes[0].nombre_archivo;
    }
    return '/assets/img/producto-default.png';
}

function aplicarFiltros() {
    if (!isCurrentPage()) return;
    
    const buscarInput = getElement('buscarProducto');
    const filtroCantidad = getElement('filtroCantidadProductos');
    const filtroCategoria = getElement('filtroCategoria');
    
    if (!buscarInput || !filtroCantidad) return;
    
    const textoBusqueda = buscarInput.value?.toLowerCase() || '';
    const cantidadMostrar = parseInt(filtroCantidad.value || 5);
    const categoriaFiltro = filtroCategoria?.value || '';
    
    let productosFiltrados = productosGlobal
        .filter(producto => producto.estado !== 2)
        .filter(producto => {
            if (categoriaFiltro && producto.id_categoria != categoriaFiltro) return false;
            return producto.nombre.toLowerCase().includes(textoBusqueda) ||
                   (producto.codigo_barras && producto.codigo_barras.includes(textoBusqueda));
        })
        .reverse();
    
    renderizar(productosFiltrados.slice(0, cantidadMostrar));
}


function renderizar(productos) {
    const tabla = getElement('tablaProductos');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    
    if (productos.length === 0) {
        tabla.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-4">No hay productos registrados</td></tr>`;
        return;
    }
    
    productos.forEach(producto => {
        const stockActual = parseFloat(producto.stock);
        const stockMinimoFijo = parseFloat(producto.stock_minimo);
        const unidadAbreviatura = producto.unidad_abreviatura || 'und';
        const esFraccionable = producto.unidad_tipo === 'DECIMAL';
        
        let stockStatus = '';
        let stockBadge = '';
        let stockClass = 'fw-bold';

        if (producto.estado === 1) {
            if (stockActual <= 0) {
                stockStatus = 'Sin Stock';
                stockBadge = 'danger';
                stockClass += ' text-danger';
            } else if (stockActual < stockMinimoFijo) {
                stockStatus = 'Stock Crítico';
                stockBadge = 'danger';
                stockClass += ' text-danger';
            } else if (stockActual === stockMinimoFijo) {
                stockStatus = 'Stock Mínimo';
                stockBadge = 'warning text-dark';
                stockClass += ' text-warning';
            } else {
                stockStatus = 'Disponible';
                stockBadge = 'success';
                stockClass += ' text-success';
            }
        } else {
            stockStatus = 'Inactivo';
            stockBadge = 'secondary';
            stockClass += ' text-secondary';
        }

        const imagenUrl = obtenerImagenPrincipal(producto);
        
        tabla.innerHTML += `
            <tr>
                <td class="text-center">${producto.id}</td>
                <td class="text-center">
                    <img src="${imagenUrl}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px; cursor: pointer;" 
                         class="img-preview" data-id="${producto.id}">
                </td>
                <td><strong>${producto.nombre}</strong><br><small class="text-muted">${producto.descripcion?.substring(0, 60) || ''}</small></td>
                <td><span class="badge bg-secondary">${producto.categoria}</span></td>
                <td>S/ ${parseFloat(producto.precio).toFixed(2)}</td>
                <td class="text-center">
                    <span class="${stockClass}">${stockActual.toFixed(2)} ${unidadAbreviatura}</span>
                    <br><span class="badge bg-${stockBadge.split(' ')[0]}">${stockStatus}</span>
                </td>
                <td class="text-center">${stockMinimoFijo.toFixed(2)} ${unidadAbreviatura}</td>
                <td class="text-center">
                    ${producto.estado === 1 ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-secondary">Inactivo</span>'}
                    ${esFraccionable ? '<br><span class="badge bg-info mt-1">Fraccionable</span>' : ''}
                </td>
                <td class="text-nowrap">
                    <button class="btn btn-sm btn-warning btnEditarProducto" data-id="${producto.id}" title="Editar"><i class="bi bi-pencil-square"></i></button>
                    ${producto.estado === 1 
                        ? `<button class="btn btn-sm btn-secondary btnDesactivarProducto" data-id="${producto.id}" title="Desactivar"><i class="bi bi-slash-circle"></i></button>`
                        : `<button class="btn btn-sm btn-success btnActivarProducto" data-id="${producto.id}" title="Activar"><i class="bi bi-check-circle"></i></button>`
                    }
                    <button class="btn btn-sm btn-danger btnEliminarProducto" data-id="${producto.id}" title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </table>
        `;
    });
}


async function cargarCategorias() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/categorias');
        categoriasGlobal = await response.json();
        
        const selectCat = getElement('id_categoria');
        if (selectCat) {
            selectCat.innerHTML = '<option value="">Seleccione categoría</option>';
            categoriasGlobal.forEach(c => {
                if (c.estado === 1) selectCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        }
        
        const filtroCat = getElement('filtroCategoria');
        if (filtroCat) {
            filtroCat.innerHTML = '<option value="">Todas las categorías</option>';
            categoriasGlobal.forEach(c => {
                if (c.estado === 1) filtroCat.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
            });
        }
    } catch (error) {
        console.error(error);
    }
}

async function cargarUnidadesMedida() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/unidades-medida');
        unidadesMedidaGlobal = await response.json();
        
        const selectUnidad = getElement('id_unidad_medida');
        if (selectUnidad) {
            selectUnidad.innerHTML = '<option value="">Seleccione unidad</option>';
            unidadesMedidaGlobal.forEach(u => {
                if (u.estado === 1) selectUnidad.innerHTML += `<option value="${u.id}">${u.nombre} (${u.abreviatura})</option>`;
            });
        }
    } catch (error) {
        console.error(error);
    }
}

async function cargarProductos() {
    if (!isCurrentPage()) return;
    try {
        const response = await fetch('/api/productos');
        if (!response.ok) throw new Error('Error al cargar productos');
        
        productosGlobal = await response.json();
        
        for (const producto of productosGlobal) {
            if (!producto.imagenes) producto.imagenes = [];
        }
        
        aplicarFiltros();
    } catch (error) {
        console.error(error);
        mostrarToast('Error al cargar productos', 'danger');
    }
}

async function cambiarEstado(id, estado, mensaje, tipo) {
    try {
        const response = await fetch(`/api/productos/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        await cargarProductos();
        mostrarToast(mensaje, tipo);
    } catch (error) {
        mostrarToast(error.message, 'danger');
    }
}


function setupGuardarProducto() {
    const btnGuardar = getElement('btnGuardarProducto');
    if (!btnGuardar) return;
    
    btnGuardar.onclick = async () => {
        const id = getElement('productoId')?.value;
        const id_categoria = getElement('id_categoria')?.value;
        const id_unidad_medida = getElement('id_unidad_medida')?.value;
        const nombre = getElement('nombreProducto')?.value.trim();
        let codigo = getElement('codigo_barras')?.value.trim();
        const precio = getElement('precio')?.value;
        let stock = parseFloat(getElement('stock')?.value) || 0;
        let stock_minimo = parseFloat(getElement('stock_minimo')?.value) || 0;
        const descripcion = getElement('descripcionProducto')?.value.trim();
        
        if (!codigo) codigo = generarCodigoBarras();
        
        if (!id_categoria) { mostrarToast('Seleccione categoría', 'warning'); return; }
        if (!id_unidad_medida) { mostrarToast('Seleccione unidad de medida', 'warning'); return; }
        if (!nombre) { mostrarToast('Nombre del producto es obligatorio', 'warning'); return; }
        if (!precio || parseFloat(precio) < 0) { mostrarToast('Precio válido requerido', 'warning'); return; }
        
        try {
            const response = await fetch(
                id ? `/api/productos/${id}` : '/api/productos',
                {
                    method: id ? 'PUT' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id_categoria: parseInt(id_categoria),
                        id_unidad_medida: parseInt(id_unidad_medida),
                        nombre,
                        descripcion,
                        precio: parseFloat(precio),
                        stock,
                        stock_minimo,
                        codigo_barras: codigo
                    })
                }
            );
            
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            let productoId = id;
            if (!id && data.id) productoId = data.id;
            
            if (id && imagenesAEliminar.length > 0) {
                for (const imgId of imagenesAEliminar) {
                    await fetch(`/api/productos/imagenes/${imgId}`, { method: 'DELETE' });
                }
                imagenesAEliminar = [];
            }
            
            if (imagenesSeleccionadas.length > 0 && productoId) {
                for (let i = 0; i < imagenesSeleccionadas.length; i++) {
                    const formData = new FormData();
                    formData.append('id_producto', productoId);
                    formData.append('principal', i === 0 ? '1' : '0');
                    formData.append('imagenes', imagenesSeleccionadas[i]);
                    await fetch('/api/productos/imagenes', { method: 'POST', body: formData });
                }
                imagenesSeleccionadas = [];
            }
            
            await cargarProductos();
            mostrarToast(id ? 'Producto actualizado' : 'Producto registrado', 'success');
            
            const modal = bootstrap.Modal.getInstance(getElement('modalProducto'));
            if (modal) modal.hide();
            limpiarFormulario();
            
        } catch (error) {
            mostrarToast(error.message, 'danger');
        }
    };
}


function setupGlobalEventListeners() {
    document.body.addEventListener('click', async (e) => {
        if (!isCurrentPage()) return;
        
        const imgPreview = e.target.closest('.img-preview');
        if (imgPreview) {
            const id = parseInt(imgPreview.dataset.id);
            const producto = productosGlobal.find(p => p.id === id);
            if (producto && producto.imagenes?.length) {
                galeriaImagenes = producto.imagenes;
                galeriaIndex = 0;
                const modal = new bootstrap.Modal(getElement('modalGaleria'));
                modal.show();
                actualizarGaleria();
            }
            return;
        }
        
        const btnEditar = e.target.closest('.btnEditarProducto');
        if (btnEditar) {
            const id = parseInt(btnEditar.dataset.id);
            const producto = productosGlobal.find(p => p.id === id);
            
            if (producto) {
                limpiarFormulario();
                
                getElement('productoId').value = producto.id;
                getElement('nombreProducto').value = producto.nombre;
                getElement('codigo_barras').value = producto.codigo_barras || '';
                getElement('id_categoria').value = producto.id_categoria;
                getElement('id_unidad_medida').value = producto.id_unidad_medida?.toString();
                getElement('precio').value = producto.precio;
                getElement('stock').value = producto.stock;
                getElement('stock_minimo').value = producto.stock_minimo;
                getElement('descripcionProducto').value = producto.descripcion || '';
                getElement('tituloModalProducto').textContent = 'Editar Producto';
                const btnGuardar = getElement('btnGuardarProducto');
                btnGuardar.textContent = 'Actualizar Producto';
                btnGuardar.classList.remove('btn-guardar');
                btnGuardar.classList.add('btn-actualizar');
                btnGuardar.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                btnGuardar.style.border = 'none';
                
                const codigoInput = getElement('codigo_barras');
                const btnGenerar = document.getElementById('btnGenerarCodigo');

                // Obtener el perfil del usuario logueado
                const sesion = JSON.parse(localStorage.getItem('sesion') || '{}');
                const esAdministrador = sesion?.usuario?.id_perfil === 1;

                if (esAdministrador) {
                    // Administrador puede editar el código
                    codigoInput.disabled = false;
                    if (btnGenerar) {
                        btnGenerar.style.display = 'inline-block';
                        btnGenerar.className = 'btn btn-primary';
                    }
                    codigoInput.style.backgroundColor = '#ffffff';
                    codigoInput.style.cursor = 'text';
                } else {
                    // Otros usuarios NO pueden editar
                    codigoInput.disabled = true;
                    if (btnGenerar) {
                        btnGenerar.style.display = 'none';
                    }
                    codigoInput.style.backgroundColor = '#f8fafc';
                    codigoInput.style.cursor = 'not-allowed';
                }

                if (producto.codigo_barras) {
                    generarImagenCodigo(producto.codigo_barras);
                }
                
                imagenesSeleccionadas = [];
                
                const responseImagenes = await fetch(`/api/productos/${id}/imagenes`);
                const imagenesExistentes = await responseImagenes.json();

                const preview = document.getElementById('previsualizacionProducto');
                if (preview) {
                    preview.innerHTML = '';
                    
                    if (imagenesExistentes && imagenesExistentes.length > 0) {
                        imagenesExistentes.forEach((img, idx) => {
                            preview.innerHTML += `
                                <div class="position-relative d-inline-block" style="width: 80px; height: 80px; margin: 5px;">
                                    <img src="${img.nombre_archivo}" style="width: 100%; height: 100%; object-fit: contain; background: #f8fafc; border-radius: 8px; border: ${idx === 0 ? '2px solid #0d6efd' : '1px solid #e2e8f0'};">
                                    <button type="button" class="btn-close bg-danger rounded-circle" 
                                            style="position: absolute; top: -6px; right: -6px; width: 16px; height: 16px; background-size: 8px; cursor: pointer; opacity: 0.9; border: none;"
                                            data-img-id="${img.id}" aria-label="Eliminar"></button>
                                    ${idx === 0 ? '<span class="position-absolute bottom-0 start-50 translate-middle badge bg-primary" style="font-size: 8px;">Principal</span>' : ''}
                                </div>
                            `;
                        });
                        
                        setTimeout(() => {
                            document.querySelectorAll('#previsualizacionProducto .btn-close').forEach(btn => {
                                btn.addEventListener('click', async (e) => {
                                    e.stopPropagation();
                                    const imgId = btn.dataset.imgId;
                                    if (imgId) {
                                        if (!imagenesAEliminar.includes(imgId)) {
                                            imagenesAEliminar.push(imgId);
                                        }
                                        btn.parentElement.remove();
                                        mostrarToast('Imagen marcada para eliminar', 'info');
                                    }
                                });
                            });
                        }, 100);
                    } else {
                        preview.innerHTML = '<div class="text-muted small w-100 text-center py-3">No hay imágenes</div>';
                    }
                }
                
                new bootstrap.Modal(getElement('modalProducto')).show();
            }
            return;
        }
        
        //Desactivar
        const btnDesactivar = e.target.closest('.btnDesactivarProducto');
        if (btnDesactivar) {
            const id = parseInt(btnDesactivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Desactivar Producto',
                '¿Desea desactivar este producto?',
                () => cambiarEstado(id, 0, 'Producto desactivado', 'warning'),
                'warning'
            );
            return;
        }
        
        //Activar
        const btnActivar = e.target.closest('.btnActivarProducto');
        if (btnActivar) {
            const id = parseInt(btnActivar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Activar Producto',
                '¿Desea activar este producto?',
                () => cambiarEstado(id, 1, 'Producto activado', 'success'),
                'success'
            );
            return;
        }
        
        //Eliminar
        const btnEliminar = e.target.closest('.btnEliminarProducto');
        if (btnEliminar) {
            const id = parseInt(btnEliminar.dataset.id);
            mostrarModalConfirmacionProfesional(
                'Eliminar Producto',
                '¿Desea eliminar este producto?',
                () => cambiarEstado(id, 2, 'Producto eliminado', 'danger'),
                'danger'
            );
            return;
        }
    });
}


function setupConfirmacionModal() {
    const btnConfirmar = document.getElementById('btnConfirmarAccionProducto');
    if (btnConfirmar) {
        btnConfirmar.onclick = async () => {
            if (confirmacionCallback) await confirmacionCallback();
            confirmacionCallback = null;
            bootstrap.Modal.getInstance(getElement('modalConfirmacionProducto'))?.hide();
            limpiarBackdrops();
        };
    }
}


function actualizarGaleria() {
    const img = getElement('imagenActual');
    const contador = getElement('contadorImagenes');
    const titulo = getElement('galeriaTitulo');
    
    if (!img || !galeriaImagenes.length) return;
    
    const imagenActual = galeriaImagenes[galeriaIndex];
    img.src = imagenActual.nombre_archivo;
    
    if (contador) {
        contador.textContent = `${galeriaIndex + 1} de ${galeriaImagenes.length}`;
    }
    
    if (titulo) {
        const esPrincipal = imagenActual.principal === 1;
        titulo.innerHTML = `<i class="bi bi-images me-2"></i> Imágenes del Producto ${esPrincipal ? '<span class="badge bg-primary ms-2">Principal</span>' : ''}`;
    }
}


function setupGaleriaNavegacion() {
    const btnAnterior = document.getElementById('btnAnterior');
    const btnSiguiente = document.getElementById('btnSiguiente');
    
    if (btnAnterior) {
        btnAnterior.onclick = (e) => {
            e.preventDefault();
            if (!galeriaImagenes.length) return;
            galeriaIndex--;
            if (galeriaIndex < 0) galeriaIndex = galeriaImagenes.length - 1;
            actualizarGaleria();
        };
    }
    
    if (btnSiguiente) {
        btnSiguiente.onclick = (e) => {
            e.preventDefault();
            if (!galeriaImagenes.length) return;
            galeriaIndex++;
            if (galeriaIndex >= galeriaImagenes.length) galeriaIndex = 0;
            actualizarGaleria();
        };
    }
}

function setupGenerarCodigo() {
    const btnGenerar = document.getElementById('btnGenerarCodigo');
    const codigoInput = getElement('codigo_barras');
    
    if (btnGenerar) {
        btnGenerar.className = 'btn btn-primary';
        
        btnGenerar.onclick = () => {
            if (codigoInput && codigoInput.disabled) {
                mostrarToast('El código de barras no puede modificarse', 'warning');
                return;
            }
            const nuevoCodigo = generarCodigoBarras();
            if (codigoInput) codigoInput.value = nuevoCodigo;
            generarImagenCodigo(nuevoCodigo);
            mostrarToast('Código generado. Se guardará al registrar el producto.', 'success');
        };
    }
    
    if (codigoInput) {
        codigoInput.addEventListener('change', () => {
            if (!codigoInput.disabled && codigoInput.value) {
                generarImagenCodigo(codigoInput.value);
            }
        });
    }
}

function setupBuscador() {
    const input = getElement('buscarProducto');
    if (input) input.addEventListener('input', () => aplicarFiltros());
}

function setupFiltroCantidad() {
    const filtro = getElement('filtroCantidadProductos');
    if (filtro) filtro.addEventListener('change', () => aplicarFiltros());
}

function setupFiltroCategoria() {
    const filtro = getElement('filtroCategoria');
    if (filtro) filtro.addEventListener('change', () => aplicarFiltros());
}


function setupNuevoProducto() {
    const nuevoBtn = document.querySelector('[data-bs-target="#modalProducto"]');
    if (nuevoBtn) {
        nuevoBtn.addEventListener('click', () => {
            limpiarFormulario();
            
            const codigoInput = getElement('codigo_barras');
            const btnGenerar = document.getElementById('btnGenerarCodigo');
            const btnGuardar = getElement('btnGuardarProducto');
            
            if (btnGuardar) {
                btnGuardar.textContent = 'Guardar Producto';
                btnGuardar.style.background = 'linear-gradient(135deg, #198754 0%, #0f5c3a 100%)';
                btnGuardar.style.border = 'none';
            }
            
            if (codigoInput) {
                codigoInput.disabled = false;
                codigoInput.value = generarCodigoBarras();
            }
            if (btnGenerar) {
                btnGenerar.style.display = 'inline-block';
                btnGenerar.className = 'btn btn-primary';
            }
            
            generarImagenCodigo(getElement('codigo_barras')?.value);
        });
    }
}

export async function init() {
    if (!isCurrentPage()) return;
    
    if (eventosInicializados) {
        await cargarProductos();
        await cargarCategorias();
        await cargarUnidadesMedida();
        return;
    }
    
    eventosInicializados = true;
    
    setupGlobalEventListeners();
    setupGuardarProducto();
    setupNuevoProducto();
    setupBuscador();
    setupFiltroCantidad();
    setupFiltroCategoria();
    setupConfirmacionModal();
    setupGenerarCodigo();
    setupGaleriaNavegacion();
    setupPrevisualizacionImagenes();
    
    await cargarCategorias();
    await cargarUnidadesMedida();
    await cargarProductos();
}

export function destroy() {
    eventosInicializados = false;
    elementos = {};
    productosGlobal = [];
    categoriasGlobal = [];
    unidadesMedidaGlobal = [];
    confirmacionCallback = null;
    imagenesSeleccionadas = [];
    imagenesAEliminar = [];
}




