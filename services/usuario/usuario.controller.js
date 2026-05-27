const service = require('./usuario.service');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getUsuarios();
        res.json(data);

    } catch (error) {
        res.status(500).json({
            error: "Error al obtener usuarios"
        });
    }
};


// Crear usuario
exports.create = async (req, res) => {
    try {
        const {
            nombre,
            apellido,
            username,
            clave,
            correo,
            id_perfil
        } = req.body;

        if (
            !nombre ||
            !apellido ||
            !username ||
            !clave ||
            !correo ||
            !id_perfil
        ) {
            return res.status(400).json({
                error: "Todos los campos son obligatorios"
            });
        }

        const nuevo = await service.createUsuario(req.body);
        res.json(nuevo);

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};


// Actualizar usuario
exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const actualizado =
            await service.updateUsuario(
                id,
                req.body,
                req.session.usuario
            );

        res.json(actualizado);

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};


// Cambiar estado usuario
exports.cambiarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;

        const resultado =
            await service.cambiarEstadoUsuario(
                id,
                estado,
                req.session.usuario
            );

        res.json(resultado);
    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};


// Cambiar estado usuarios por perfil
exports.cambiarEstadoPorPerfil = async (req, res) => {
    try {
        const {id_perfil, estado} = req.body;

        const resultado = await service.cambiarEstadoUsuariosPorPerfil(
            id_perfil,
            estado,
            req.session.usuario
        );

        res.json(resultado);

    } catch (error) {
        res.status(400).json({
            error: error.message
        });
    }
};






