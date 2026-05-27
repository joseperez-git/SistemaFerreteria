const db = require('../../config/db');
const fs = require('fs');
const path = require('path');


// LISTAR PRODUCTOS
exports.getProductos = async () => {
    const [rows] = await db.query('CALL sp_producto_listar()');
    const productos = rows[0];
    
    for (const producto of productos) {
        const [imagenes] = await db.query('CALL sp_producto_imagen_listar_por_producto(?)', [producto.id]);
        producto.imagenes = imagenes[0] || [];
    }
    
    return productos;
};


// CREAR PRODUCTO
exports.createProducto = async (body) => {
    const {
        id_categoria,
        id_unidad_medida,
        nombre,
        descripcion,
        precio,
        stock,
        stock_minimo,
        codigo_barras
    } = body;

    if (!id_categoria) throw new Error('La categoría es obligatoria');
    if (!id_unidad_medida) throw new Error('La unidad de medida es obligatoria');
    if (!nombre || nombre.trim() === '') throw new Error('El nombre del producto es obligatorio');
    if (precio === undefined || precio === null || precio < 0) throw new Error('El precio debe ser un valor válido y no negativo');

    const [result] = await db.query(
        'CALL sp_producto_insertar(?, ?, ?, ?, ?, ?, ?, ?)',
        [
            parseInt(id_categoria),
            parseInt(id_unidad_medida),
            nombre.trim(),
            descripcion || null,
            parseFloat(precio),
            parseFloat(stock) || 0,
            parseFloat(stock_minimo) || 0,
            codigo_barras ? codigo_barras.trim() : null
        ]
    );

    let insertedId = null;
    if (result && result[0] && result[0][0]) {
        insertedId = result[0][0].id;
    }

    return {
        id: insertedId,
        message: 'Producto registrado correctamente'
    };
};


// ACTUALIZAR PRODUCTO
exports.updateProducto = async (id, body) => {
    const {
        id_categoria,
        id_unidad_medida,
        nombre,
        descripcion,
        precio,
        stock,
        stock_minimo,
        codigo_barras,
        estado
    } = body;

    if (estado !== undefined && ![0, 1, 2].includes(Number(estado))) {
        throw new Error('Estado inválido');
    }

    if (estado !== undefined && Object.keys(body).length === 1) {
        if (estado === 0) {
            await db.query('CALL sp_producto_desactivar(?)', [id]);
            return { message: 'Producto desactivado correctamente' };
        } else if (estado === 1) {
            await db.query('CALL sp_producto_activar(?)', [id]);
            return { message: 'Producto activado correctamente' };
        } else if (estado === 2) {
            await db.query('CALL sp_producto_eliminar(?)', [id]);
            return { message: 'Producto eliminado correctamente' };
        }
    }

    if (!id_categoria) throw new Error('La categoría es obligatoria');
    if (!id_unidad_medida) throw new Error('La unidad de medida es obligatoria');
    if (!nombre || nombre.trim() === '') throw new Error('El nombre del producto es obligatorio');
    if (precio === undefined || precio === null || precio < 0) throw new Error('El precio debe ser un valor válido y no negativo');

    await db.query(
        'CALL sp_producto_actualizar(?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            id,
            parseInt(id_categoria),
            parseInt(id_unidad_medida),
            nombre.trim(),
            descripcion || null,
            parseFloat(precio),
            parseFloat(stock) || 0,
            parseFloat(stock_minimo) || 0,
            codigo_barras ? codigo_barras.trim() : null
        ]
    );

    return { message: 'Producto actualizado correctamente' };
};


// LISTAR IMÁGENES DE UN PRODUCTO
exports.getImagenesPorProducto = async (id_producto) => {
    const [rows] = await db.query('CALL sp_producto_imagen_listar_por_producto(?)', [id_producto]);
    return rows[0];
};


// SUBIR IMÁGENES
exports.subirImagenes = async (id_producto, archivos, esPrincipal) => {
    if (!archivos || archivos.length === 0) {
        throw new Error('No se recibieron imágenes');
    }

    const [imagenesExistentes] = await db.query('CALL sp_producto_imagen_listar_por_producto(?)', [id_producto]);
    const noTieneImagenes = imagenesExistentes[0].length === 0;
    const resultados = [];

    for (let i = 0; i < archivos.length; i++) {
        const archivo = archivos[i];
        const rutaRelativa = `/uploads/productos/${archivo.filename}`;

        // validar duplicado
        const [duplicadoResult] = await db.query('CALL sp_validar_imagen_duplicada(?, ?, @p_existe)', [id_producto, rutaRelativa]);
        const [existeResult] = await db.query('SELECT @p_existe AS existe');
        
        if (existeResult[0].existe) {
            continue; // Saltar duplicado
        }

        const principal = (esPrincipal === '1' || esPrincipal === true) && noTieneImagenes && i === 0;

        await db.query('CALL sp_producto_imagen_registrar(?, ?, ?)', [
            id_producto,
            rutaRelativa,
            principal ? 1 : 0
        ]);

        resultados.push({
            nombre_archivo: rutaRelativa,
            principal: principal ? 1 : 0
        });
    }

    return {
        message: `${resultados.length} imagen(es) subida(s) correctamente`,
        imagenes: resultados
    };
};


// ELIMINAR IMAGEN
exports.eliminarImagen = async (id_imagen) => {
    const [rows] = await db.query('CALL sp_producto_imagen_buscar_por_id(?)', [id_imagen]);
    const imagen = rows[0][0];

    if (!imagen) {
        return { message: 'Imagen no encontrada' };
    }

    const filePath = path.join(__dirname, '../../public', imagen.nombre_archivo);
    
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    await db.query('CALL sp_producto_imagen_eliminar(?)', [id_imagen]);

    return { message: 'Imagen eliminada correctamente' };
};


// MARCAR IMAGEN COMO PRINCIPAL
exports.marcarImagenPrincipal = async (id_imagen, id_producto) => {
    const [rows] = await db.query('CALL sp_producto_imagen_buscar_por_id(?)', [id_imagen]);
    const imagen = rows[0][0];

    if (!imagen) {
        throw new Error('Imagen no encontrada');
    }

    await db.query('CALL sp_producto_imagen_actualizar(?, ?, ?, ?)', [
        id_imagen,
        id_producto,
        imagen.nombre_archivo,
        1
    ]);

    return { message: 'Imagen marcada como principal' };
};




