const db = require('../../config/db');
const bcrypt = require('bcrypt');

exports.login = async (username, clave) => {
    if (!username || !clave) {
        throw new Error('Usuario y contraseña son obligatorios');
    }

    try {
        const [rows] = await db.query('CALL sp_login_usuario(?)', [username]);
        const usuario = rows[0][0];

        if (!usuario) {
            throw new Error('Usuario o contraseña incorrectos');
        }

        if (usuario.usuario_estado !== 1) {
            if (usuario.usuario_estado === 2) {
                throw new Error('Usuario eliminado. Contacte al administrador.');
            }
            throw new Error('Usuario desactivado. Contacte al administrador.');
        }

        if (usuario.perfil_estado !== 1) {
            throw new Error('Su perfil está desactivado. No puede iniciar sesión.');
        }

        // Verificar bloqueo activo
        if (usuario.bloqueo_hasta && new Date() < new Date(usuario.bloqueo_hasta)) {
            throw new Error('Demasiados intentos fallidos. Acceso bloqueado temporalmente.');
        }

        const claveValida = await bcrypt.compare(clave, usuario.clave);
        if (!claveValida) {
            const [result] = await db.query('CALL sp_fallar_login(?, @p_intentos_restantes)', [usuario.id]);
            const [infoResult] = await db.query('SELECT @p_intentos_restantes AS intentos_restantes');
            
            const intentosRestantes = infoResult[0].intentos_restantes;
            
            if (intentosRestantes > 0) {
                throw new Error(`Usuario o contraseña incorrectos. Le quedan ${intentosRestantes} intento(s).`);
            } else {
                throw new Error('Demasiados intentos fallidos. Acceso bloqueado temporalmente.');
            }
        }

        await db.query('CALL sp_reiniciar_login(?)', [usuario.id]);

        const [permisos] = await db.query('CALL sp_listar_opciones_por_perfil(?)', [usuario.id_perfil]);

        return {
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                apellido: usuario.apellido,
                username: usuario.username,
                correo: usuario.correo,
                id_perfil: usuario.id_perfil,
                perfil_nombre: usuario.perfil_nombre
            },
            permisos: permisos[0] || []
        };

    } catch (error) {
        throw new Error(error.message);
    }
};



