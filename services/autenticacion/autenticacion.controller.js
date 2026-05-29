const service = require('./autenticacion.service');

exports.login = async (req, res) => {
    try {
        const { username, clave } = req.body;

        if (!username || !clave) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
        }

        const resultado = await service.login(username, clave);

        req.session.usuario = resultado.usuario;
        res.json(resultado);

    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};

exports.getMenu = async (req, res) => {
    try {
        const idUsuario = req.session.usuario?.id;
        
        if (!idUsuario) {
            return res.status(401).json({ error: 'No autenticado' });
        }
        
        const menu = await service.getMenu(idUsuario);
        res.json(menu);
        
    } catch (error) {
        console.error('Error al obtener menú:', error);
        res.status(500).json({ error: error.message });
    }
};


