const db = require('../../config/db');

// LISTAR CATEGORIAS
exports.getCategorias = async () => {
    const [rows] = await db.query('CALL sp_categoria_listar()');
    return rows[0];
};


// CREAR CATEGORIA
exports.createCategoria = async (body) => {
    const { nombre, descripcion } = body;

    // Validar campos
    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la categoría es obligatorio');
    }

    if (!descripcion || descripcion.trim() === '') {
        throw new Error('La descripción de la categoría es obligatoria');
    }

    // Ejecutar procedimiento
    const [result] = await db.query(
        'CALL sp_categoria_insertar(?, ?)',
        [nombre.trim(), descripcion.trim()]
    );

    return {
        message: 'Categoría registrada correctamente',
        data: result
    };
};


// ACTUALIZAR CATEGORIA
exports.updateCategoria = async (id, body) => {
    const { nombre, descripcion, estado } = body;

    // Validar estado
    if (estado !== undefined && ![0, 1, 2].includes(Number(estado))) {
        throw new Error('Estado inválido');
    }

    // Validar nombre
    if (nombre && nombre.trim() === '') {
        throw new Error('El nombre de la categoría es obligatorio');
    }

    // Obtener la categoría actual
    const [rows] = await db.query('CALL sp_categoria_obtener_por_id(?)', [id]);
    const categoriaActual = rows[0][0];

    if (!categoriaActual) {
        throw new Error('Categoría no encontrada');
    }

    // Usar valores actuales si no se envían nuevos
    const nuevoNombre = nombre !== undefined ? nombre.trim() : categoriaActual.nombre;
    const nuevaDescripcion = descripcion !== undefined ? descripcion.trim() : categoriaActual.descripcion;
    const nuevoEstado = estado !== undefined ? estado : categoriaActual.estado;

    // Ejecutar procedimiento
    await db.query(
        'CALL sp_categoria_actualizar(?, ?, ?, ?)',
        [id, nuevoNombre, nuevaDescripcion || '', nuevoEstado]
    );

    return {
        message: 'Categoría actualizada correctamente'
    };
};


// ELIMINAR CATEGORIA (LÓGICO)
exports.deleteCategoria = async (id) => {
    // Verificar si existe
    const [rows] = await db.query('CALL sp_categoria_obtener_por_id(?)', [id]);
    const categoria = rows[0][0];

    if (!categoria) {
        throw new Error('Categoría no encontrada');
    }

    // Ejecutar eliminación lógica
    await db.query('CALL sp_categoria_eliminar(?)', [id]);

    return {
        message: 'Categoría eliminada correctamente'
    };
};


// BUSCAR CATEGORIA (OPCIONAL)
exports.buscarCategorias = async (busqueda) => {
    const [rows] = await db.query('CALL sp_categoria_buscar(?)', [busqueda]);
    return rows[0];
};




