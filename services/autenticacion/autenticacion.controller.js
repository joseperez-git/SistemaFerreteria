const service = require('./autenticacion.service');

exports.login = async (req, res) => {
    try {
        const { username, clave } = req.body;

        if (!username || !clave) {
            return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
        }

        const resultado = await service.login(username, clave);

        req.session.usuario = resultado.usuario;
        req.session.permisos = resultado.permisos;
        res.json(resultado);

    } catch (error) {
        res.status(401).json({ error: error.message });
    }
};