const service = require('./permiso.service');


exports.getPermisos = async (req, res) => {
    try {
        const idPerfil = parseInt(req.params.idPerfil);
        
        if (isNaN(idPerfil)) {
            return res.status(400).json({ error: "ID de perfil inválido" });
        }
        
        const permisos = await service.getPermisos(idPerfil);
        res.json(permisos);

    } catch (error) {
        console.error('Error al obtener permisos:', error);
        res.status(400).json({ error: error.message });
    }
};


exports.savePermisos = async (req, res) => {
    try {
        const { id_perfil, opciones } = req.body;
        const idUsuarioSesion = req.session.usuario?.id;
        
        if (!id_perfil) {
            return res.status(400).json({ error: "ID de perfil es obligatorio" });
        }
        
        if (!opciones || !Array.isArray(opciones)) {
            return res.status(400).json({ error: "La lista de opciones es obligatoria" });
        }
        
        const resultado = await service.savePermisos(req.body, idUsuarioSesion);
        res.json(resultado);

    } catch (error) {
        console.error('Error al guardar permisos:', error);
        res.status(400).json({ error: error.message });
    }
};


