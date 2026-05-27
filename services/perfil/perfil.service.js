const db = require('../../config/db');
const permisoService = require('../permiso/permiso.service');


// LISTAR PERFILES
exports.getPerfiles = async () => {
    const [rows] = await db.query('CALL sp_perfil_listar()');
    return rows[0];
};


// CREAR PERFIL
exports.createPerfil = async (body) => {
    const { nombre, descripcion } = body;

    if (!nombre || nombre.trim() === '') {
        throw new Error('El nombre del perfil es obligatorio');
    }

    await db.query('CALL sp_perfil_insertar(?, ?)', [
        nombre.trim(),
        descripcion?.trim() || null
    ]);

    return { message: 'Perfil registrado correctamente' };
};


// CONTAR USUARIOS ACTIVOS POR PERFIL
exports.contarUsuariosActivos = async (idPerfil) => {
    const [result] = await db.query('CALL sp_contar_usuarios_activos_por_perfil(?, @p_total)', [idPerfil]);
    const [totalResult] = await db.query('SELECT @p_total AS total');
    return totalResult[0].total;
};


// ACTUALIZAR PERFIL
exports.updatePerfil = async (id, body) => {
    const { nombre, descripcion, estado } = body;

    if (estado !== undefined) {
        if (estado === 0) {
            console.log(`Desactivando perfil ID: ${id}`);
            await db.query('CALL sp_perfil_desactivar(?)', [id]);
            console.log(`Perfil ${id} desactivado`);
            
            const totalUsuarios = await exports.contarUsuariosActivos(id);
            
            let mensaje = 'Perfil desactivado correctamente';
            if (totalUsuarios > 0) {
                mensaje = `Perfil desactivado. ${totalUsuarios} usuario(s) no podrán iniciar sesión hasta que el perfil sea reactivado.`;
            }
            return { message: mensaje, totalUsuarios: totalUsuarios };
            
        } else if (estado === 1) {
            await db.query('CALL sp_perfil_activar(?)', [id]);
            return { message: 'Perfil activado correctamente' };
        } else if (estado === 2) {
            await db.query('CALL sp_perfil_eliminar(?)', [id]);
            return { message: 'Perfil eliminado correctamente' };
        }
    }

    if (nombre !== undefined) {
        if (!nombre || nombre.trim() === '') {
            throw new Error('El nombre del perfil es obligatorio');
        }
        await db.query('CALL sp_perfil_actualizar(?, ?, ?)', [
            id,
            nombre.trim(),
            descripcion?.trim() || null
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
exports.guardarPermisosPerfil = async (idPerfil, permisos) => {
    return await permisoService.savePermisos({ id_perfil: idPerfil, opciones: permisos });
};



