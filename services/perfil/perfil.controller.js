const service = require('./perfil.service');

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
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const perfil = await service.getPerfilById(id);
        
        if (!perfil) {
            return res.status(404).json({ error: 'Perfil no encontrado' });
        }
        
        res.json(perfil);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


exports.create = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        const idUsuarioSesion = req.session.usuario?.id;

        if (!nombre || !descripcion) {
            return res.status(400).json({
                error: 'Todos los campos son obligatorios'
            });
        }

        if (!idUsuarioSesion) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        const nuevo = await service.createPerfil({
            nombre: nombre.trim(),
            descripcion: descripcion.trim()
        }, idUsuarioSesion);

        res.json(nuevo);

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


exports.update = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { nombre, descripcion, estado } = req.body;
        const idUsuarioSesion = req.session.usuario?.id;
        
        if (!idUsuarioSesion) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }

        if (estado !== undefined && estado !== 0 && estado !== 1 && estado !== 2) {
            return res.status(400).json({ error: 'Estado inválido' });
        }

        const actualizado = await service.updatePerfil(id, { nombre, descripcion, estado }, idUsuarioSesion);
        res.json(actualizado);

    } catch (error) {
        console.error('Error en update:', error);
        res.status(400).json({ error: error.message });
    }
};


exports.remove = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const idUsuarioSesion = req.session.usuario?.id;
        
        if (!idUsuarioSesion) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const eliminado = await service.updatePerfil(id, { estado: 2 }, idUsuarioSesion);
        res.json(eliminado);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


exports.countUsuariosActivos = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        
        if (isNaN(id)) {
            return res.status(400).json({ error: 'ID inválido' });
        }
        
        const total = await service.contarUsuariosActivos(id);
        res.json({ totalUsuarios: total });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


