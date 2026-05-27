const db = require('../../config/db');


// LISTAR OPCIONES ACTIVAS
exports.getOpciones = async () => {
    const [rows] = await db.query('CALL sp_opcion_listar()');
    return rows[0];
};


// OBTENER OPCION POR ID
exports.getOpcionById = async (id) => {
    const [rows] = await db.query('CALL sp_opcion_obtener(?)', [id]);
    return rows[0][0];
};


// CREAR OPCION
exports.createOpcion = async (body) => {
    const { nombre, ruta, icono } = body;

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la opción es obligatorio');
    }

    if (!ruta || ruta.trim() === '') {
        throw new Error('La ruta es obligatoria');
    }

    await db.query('CALL sp_opcion_insertar(?, ?, ?)', [
        nombre.trim(),
        ruta.trim(),
        icono?.trim() || null
    ]);

    return { message: 'Opción registrada correctamente' };
};


// ACTUALIZAR OPCION
exports.updateOpcion = async (id, body) => {
    const { nombre, ruta, icono } = body;

    await db.query('CALL sp_opcion_actualizar(?, ?, ?, ?)', [
        id,
        nombre?.trim(),
        ruta?.trim(),
        icono?.trim() || null
    ]);

    return { message: 'Opción actualizada correctamente' };
};


// DESACTIVAR OPCION
exports.desactivarOpcion = async (id) => {
    await db.query('CALL sp_opcion_desactivar(?)', [id]);
    return { message: 'Opción desactivada correctamente' };
};


// ACTIVAR OPCION
exports.activarOpcion = async (id) => {
    await db.query('CALL sp_opcion_activar(?)', [id]);
    return { message: 'Opción activada correctamente' };
};


// ELIMINAR OPCION (LÓGICO)
exports.deleteOpcion = async (id) => {
    await db.query('CALL sp_opcion_eliminar(?)', [id]);
    return { message: 'Opción eliminada correctamente' };
};




