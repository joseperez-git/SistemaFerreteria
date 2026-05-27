const db = require('../../config/db');


// OBTENER PERMISOS POR PERFIL
exports.getPermisos = async (idPerfil) => {
    const [rows] = await db.query('CALL sp_listar_opciones_por_perfil(?)', [idPerfil]);
    return rows[0];
};


// GUARDAR PERMISOS DE PERFIL
exports.savePermisos = async (body) => {
    const { id_perfil, opciones } = body;

    // Validar que el perfil existe
    await db.query('CALL sp_validar_perfil_existe(?, @p_existe)', [id_perfil]);
    const [result] = await db.query('SELECT @p_existe AS existe');
    
    if (!result[0].existe) {
        throw new Error('El perfil no existe');
    }

    if (!Array.isArray(opciones)) {
        throw new Error('La lista de opciones debe ser un array');
    }

    // Convertir array a string separado por comas
    const opcionesStr = opciones.join(',');

    // Reemplazar todos los permisos
    await db.query('CALL sp_reemplazar_permisos_perfil(?, ?)', [id_perfil, opcionesStr]);

    return {
        message: 'Permisos actualizados correctamente'
    };
};




