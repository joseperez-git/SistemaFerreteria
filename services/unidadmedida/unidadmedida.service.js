const db = require('../../config/db');


// LISTAR UNIDADES DE MEDIDA ACTIVAS
exports.getUnidadesMedida = async () => {
    const [rows] = await db.query('CALL sp_unidad_medida_listar()');
    return rows[0];
};


// LISTAR TODAS LAS UNIDADES DE MEDIDA
exports.getAllUnidadesMedida = async () => {
    const [rows] = await db.query('CALL sp_unidad_medida_listar_todas()');
    return rows[0];
};


// OBTENER UNIDAD DE MEDIDA POR ID
exports.getUnidadMedidaById = async (id) => {
    const [rows] = await db.query('CALL sp_unidad_medida_obtener(?)', [id]);
    return rows[0][0];
};


// REGISTRAR UNIDAD DE MEDIDA
exports.createUnidadMedida = async (body) => {
    const { nombre, abreviatura, tipo } = body;

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre de la unidad es obligatorio');
    }

    if (!abreviatura || abreviatura.trim() === '') {
        throw new Error('La abreviatura es obligatoria');
    }

    if (!tipo || !['ENTERO', 'DECIMAL'].includes(tipo.toUpperCase())) {
        throw new Error('El tipo debe ser ENTERO o DECIMAL');
    }

    await db.query('CALL sp_unidad_medida_registrar(?, ?, ?)', [
        nombre.trim(),
        abreviatura.trim(),
        tipo.toUpperCase()
    ]);

    return { message: 'Unidad de medida registrada correctamente' };
};


// ACTUALIZAR UNIDAD DE MEDIDA
exports.updateUnidadMedida = async (id, body) => {
    const { nombre, abreviatura, tipo, estado } = body;

    await db.query('CALL sp_unidad_medida_actualizar(?, ?, ?, ?, ?)', [
        id,
        nombre?.trim(),
        abreviatura?.trim(),
        tipo?.toUpperCase(),
        estado
    ]);

    return { message: 'Unidad de medida actualizada correctamente' };
};


// ELIMINAR UNIDAD DE MEDIDA
exports.deleteUnidadMedida = async (id) => {
    await db.query('CALL sp_unidad_medida_eliminar(?)', [id]);
    return { message: 'Unidad de medida eliminada correctamente' };
};



