const db = require('../../config/db');


exports.getPermisos = async (idPerfil) => {
    const [rows] = await db.query('CALL sp_listar_opciones_por_perfil(?)', [idPerfil]);
    
    // Asegurar que devolvemos un array
    if (rows && Array.isArray(rows[0])) {
        return rows[0];
    }
    
    if (rows && rows[0] && rows[0][0] && Array.isArray(rows[0][0])) {
        return rows[0][0];
    }
    
    return [];
};


exports.savePermisos = async (body, idUsuarioSesion = null) => {
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

    // Permisos obligatorios para administrador
    const PERFIL_ADMIN_ID = 1;
    const OPCIONES_OBLIGATORIAS = [1, 3]; // Dashboard y Perfiles
    
    if (parseInt(id_perfil) === PERFIL_ADMIN_ID) {
        const opcionesSet = new Set(opciones.map(o => parseInt(o)));
        
        for (const opcionId of OPCIONES_OBLIGATORIAS) {
            if (!opcionesSet.has(opcionId)) {
                throw new Error('El perfil Administrador debe tener acceso a los módulos Dashboard y Perfiles obligatoriamente');
            }
        }
    }
    
    const opcionesStr = opciones.join(',');
    await db.query('CALL sp_reemplazar_permisos_perfil(?, ?)', [id_perfil, opcionesStr]);

    return {
        message: 'Permisos actualizados correctamente'
    };
};


