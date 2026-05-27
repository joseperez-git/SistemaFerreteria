const bcrypt = require('bcrypt');
const db = require('../../config/db');


// Listar usuarios
exports.getUsuarios = async () => {
    const [rows] = await db.query('CALL sp_usuario_listar()');
    return rows[0];
};


//Crear usuario
exports.createUsuario = async (body) => {
    try {
        const { nombre, apellido, username, clave, correo, id_perfil } = body;

        //Validación de campos obligatorios
        if (!nombre || !apellido || !username || !clave || !correo || !id_perfil) {
            throw new Error("Todos los campos son obligatorios");
        }

        //Validación de espacios vacíos
        if (
            nombre.trim() === '' ||
            apellido.trim() === '' ||
            username.trim() === '' ||
            clave.trim() === '' ||
            correo.trim() === ''
        ) {
            throw new Error("Los campos no pueden estar vacíos");
        }

        //Validación de correo
        const correoRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!correoRegex.test(correo)) {
            throw new Error("Correo inválido");
        }

        //Validación de contraseña
        if (clave.length < 6) {
            throw new Error("La contraseña debe tener al menos 6 caracteres");
        }

        //Encriptar contraseña
        const saltRounds = 10;
        const claveHash = await bcrypt.hash(clave, saltRounds);

        //Llamada a MySQL
        //Guardar hash en BD
        const [result] = await db.query(
            'CALL sp_registrar_usuario(?,?,?,?,?,?)',
            [
                id_perfil,
                nombre.trim(),
                apellido.trim(),
                username.trim(),
                claveHash,
                correo.trim()
            ]
        );

        return {
            message: "Usuario creado correctamente",
            data: result
        };

    } catch (error) {
        throw new Error(error.message);
    }
};


//Actualizar usuario
exports.updateUsuario = async (id, body, usuarioSesion) => {
    try {
        const {nombre, apellido, username, clave, correo, id_perfil} = body;

        // Obtener usuario objetivo
        const [rowsUsuario] = await db.query(
            'CALL sp_obtener_usuario_validacion(?)',
            [id]
        );

        const usuarioObjetivo =
            rowsUsuario[0][0];

        // proteger administradores
        if(
            usuarioObjetivo.perfil
                .toUpperCase() ===
            'ADMINISTRADOR'
        ){

            if(
                usuarioSesion.perfil_nombre
                    .toUpperCase() !==
                'ADMINISTRADOR'
            ){

                throw new Error(
                    'No tiene permisos para modificar administradores'
                );
            }
        }

        //Validaciones básicas
        if (
            !nombre ||
            !apellido ||
            !username ||
            !correo ||
            !id_perfil
        ) {
            throw new Error(
                "Todos los campos son obligatorios"
            );
        }

        //Validar espacios vacíos
        if (
            nombre.trim() === '' ||
            apellido.trim() === '' ||
            username.trim() === '' ||
            correo.trim() === ''
        ) {
            throw new Error(
                "Los campos no pueden estar vacíos"
            );
        }

        //Validar correo
        const correoRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!correoRegex.test(correo)) {
            throw new Error(
                "Correo inválido"
            );
        }

        //Actualizar datos generales
        await db.query(
            'CALL sp_actualizar_usuario(?,?,?,?,?,?)',
            [
                id,
                id_perfil,
                nombre.trim(),
                apellido.trim(),
                username.trim(),
                correo.trim()
            ]
        );

        //Si enviaron nueva clave
        if (
            clave &&
            clave.trim() !== ''
        ) {

            if (clave.length < 6) {
                throw new Error(
                    "La contraseña debe tener mínimo 6 caracteres"
                );
            }

            const saltRounds = 10;

            const claveHash = await bcrypt.hash(
                clave,
                saltRounds
            );

            // actualizar clave aparte
            await db.query(
                'CALL sp_actualizar_clave_usuario(?,?)',
                [
                    id,
                    claveHash
                ]
            );
        }

        return {
            message:
                "Usuario actualizado correctamente"
        };

    } catch (error) {
        throw new Error(error.message);
    }    
};


// Cambiar estado usuario
exports.cambiarEstadoUsuario = async (id, estado, usuarioSesion) => {
    try {
        // Validar estado permitido
        if (![0, 1, 2].includes(Number(estado))) {
            throw new Error("Estado inválido");
        }

        // Obtener usuario objetivo
        const [rowsUsuario] = await db.query(
            'CALL sp_obtener_usuario_validacion(?)',
            [id]
        );

        const usuarioObjetivo =
            rowsUsuario[0][0];

        // proteger administradores
        if(
            usuarioObjetivo.perfil
                .toUpperCase() ===
            'ADMINISTRADOR'
        ){

            if(
                usuarioSesion.perfil_nombre
                    .toUpperCase() !==
                'ADMINISTRADOR'
            ){

                throw new Error(
                    'No tiene permisos para modificar administradores'
                );
            }
        }
        
        // Ejecutar procedimiento
        await db.query(
            'CALL sp_cambiar_estado_usuario(?, ?)',
            [
                id,
                estado
            ]
        );

        return {
            message: "Estado del usuario actualizado correctamente"
        };
        
    } catch (error) {
        throw new Error(error.message);
    }    
};


// Cambiar estado usuarios por perfil
exports.cambiarEstadoUsuariosPorPerfil = async (id_perfil, estado, usuarioSesion) => {
    try {
        // validar estado
        if(
            ![0,1,2].includes(
                Number(estado)
            )
        ){

            throw new Error(
                'Estado inválido'
            );
        }

        // solo administrador
        if(
            usuarioSesion.perfil_nombre
                .toUpperCase() !==
            'ADMINISTRADOR'
        ){

            throw new Error(
                'No tiene permisos'
            );
        }

        // ejecutar procedimiento
        await db.query(
            'CALL sp_cambiar_estado_usuarios_por_perfil(?,?)',
            [
                id_perfil,
                estado
            ]
        );

        return {
            message:
                'Usuarios actualizados correctamente'
        };

    } catch (error) {
        throw new Error(error.message);
    }    
};



