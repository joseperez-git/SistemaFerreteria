const db = require('../../config/db');
const permisoService = require('../permiso/permiso.service');


// LISTAR PERFILES
exports.getPerfiles = async () => {
    const [rows] = await db.query('CALL sp_perfil_listar()');
    return rows[0];
};


// OBTENER PERFIL POR ID
exports.getPerfilById = async (id) => {
    const [rows] = await db.query('CALL sp_perfil_obtener(?)', [id]);
    return rows[0][0];
};


// CREAR PERFIL
exports.createPerfil = async (body, idUsuarioSesion) => {
    const { nombre, descripcion } = body;

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del perfil es obligatorio');
    }

    await db.query('CALL sp_perfil_insertar(?, ?, ?)', [
        nombre.trim(),
        descripcion?.trim() || null,
        idUsuarioSesion
    ]);

    return { message: 'Perfil registrado correctamente' };
};


// CONTAR USUARIOS ACTIVOS POR PERFIL
exports.contarUsuariosActivos = async (idPerfil) => {
    const [result] = await db.query('CALL sp_contar_usuarios_activos_por_perfil(?, @p_total)', [idPerfil]);
    const [totalResult] = await db.query('SELECT @p_total AS total');
    return totalResult[0].total;
};


// VALIDAR PERMISOS SOBRE UN PERFIL
exports.validarPermisosPerfil = async (idPerfil, idUsuarioSesion, accion) => {
    const [result] = await db.query(
        'CALL sp_validar_modificacion_perfil(?, ?, ?, @p_permiso, @p_mensaje)',
        [idPerfil, idUsuarioSesion, accion]
    );
    
    const [permisoResult] = await db.query('SELECT @p_permiso AS permiso, @p_mensaje AS mensaje');
    
    if (permisoResult[0].permiso === 0 || permisoResult[0].permiso === false) {
        throw new Error(permisoResult[0].mensaje);
    }
    
    return true;
};


// ACTUALIZAR PERFIL
exports.updatePerfil = async (id, body, idUsuarioSesion) => {
    const { nombre, descripcion, estado } = body;

    // DESACTIVAR
    if (estado === 0) {
        await exports.validarPermisosPerfil(id, idUsuarioSesion, 'DESACTIVAR');
        await db.query('CALL sp_perfil_desactivar(?, ?)', [id, idUsuarioSesion]);
        
        const totalUsuarios = await exports.contarUsuariosActivos(id);
        let mensaje = 'Perfil desactivado correctamente';
        if (totalUsuarios > 0) {
            mensaje = `Perfil desactivado. ${totalUsuarios} usuario(s) no podrán iniciar sesión hasta que el perfil sea reactivado.`;
        }
        return { message: mensaje, totalUsuarios: totalUsuarios };
    }
    
    // ACTIVAR
    if (estado === 1) {
        await db.query('CALL sp_perfil_activar(?)', [id]);
        return { message: 'Perfil activado correctamente' };
    }
    
    // ELIMINAR
    if (estado === 2) {
        await exports.validarPermisosPerfil(id, idUsuarioSesion, 'ELIMINAR');
        await db.query('CALL sp_perfil_eliminar(?, ?)', [id, idUsuarioSesion]);
        return { message: 'Perfil eliminado correctamente' };
    }
    
    // EDITAR (nombre, descripción)
    if (nombre !== undefined || descripcion !== undefined) {
        await exports.validarPermisosPerfil(id, idUsuarioSesion, 'EDITAR');
        await db.query('CALL sp_perfil_actualizar(?, ?, ?, ?)', [
            id,
            nombre?.trim() || null,
            descripcion?.trim() || null,
            idUsuarioSesion
        ]);
        return { message: 'Perfil actualizado correctamente' };
    }

    return { message: 'No se realizaron cambios' };
};


// OBTENER PERMISOS DE UN PERFIL 
exports.obtenerPermisosPerfil = async (idPerfil) => {
    return await permisoService.getPermisos(idPerfil);
};


// GUARDAR PERMISOS DE UN PERFIL 
exports.guardarPermisosPerfil = async (idPerfil, permisos, idUsuarioSesion) => {
    // Validar permisos para modificar permisos
    await exports.validarPermisosPerfil(idPerfil, idUsuarioSesion, 'PERMISOS');
    
    // Si pasa la validación, guardar permisos
    return await permisoService.savePermisos({ id_perfil: idPerfil, opciones: permisos }, idUsuarioSesion);
};


