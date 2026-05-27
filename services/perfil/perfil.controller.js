const service = require('./perfil.service');
const db = require('../../config/db');

exports.getAll = async (req, res) => {
    try {
        const data = await service.getPerfiles();
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getById = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [rows] = await db.query('CALL sp_perfil_obtener(?)', [id]);
        res.json(rows[0][0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        if (!nombre || !descripcion) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        const nuevo = await service.createPerfil({
            nombre: nombre.trim(),
            descripcion: descripcion.trim()
        });

        res.json(nuevo);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre, descripcion, estado } = req.body;

        if (estado !== undefined && estado !== 0 && estado !== 1 && estado !== 2) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        if (nombre !== undefined && nombre.trim() === '') {
            return res.status(400).json({ error: 'El nombre es obligatorio' });
        }

        if (descripcion !== undefined && descripcion.trim() === '') {
            return res.status(400).json({ error: 'La descripción es obligatoria' });
        }

        const actualizado = await service.updatePerfil(id, { nombre, descripcion, estado });
        res.json(actualizado);

    } catch (error) {
        console.error('Error en update:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const eliminado = await service.updatePerfil(id, { estado: 2 });
        res.json(eliminado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};

exports.countUsuariosActivos = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const [result] = await db.query('CALL sp_contar_usuarios_activos_por_perfil(?, @p_total)', [id]);
        const [totalResult] = await db.query('SELECT @p_total AS total');
        res.json({ totalUsuarios: totalResult[0].total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerPermisosPerfil = async (req, res) => {
    try {
        const permisos = await service.obtenerPermisosPerfil(req.params.id);
        res.json(permisos);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.guardarPermisosPerfil = async (req, res) => {
    try {
        const resultado = await service.guardarPermisosPerfil(
            req.params.id,
            req.body.permisos
        );
        res.json(resultado);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



