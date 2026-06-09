const service = require('./entrega.service');

exports.confirmarEntrega = async (req, res) => {
    try {
        console.log('=== CONFIRMAR ENTREGA ===');
        console.log('Params:', req.params);
        console.log('Body:', req.body);
        
        const idPedido = parseInt(req.params.idPedido);
        const { productos } = req.body;
        const idUsuarioSesion = req.session.usuario?.id;
        
        console.log('idPedido:', idPedido);
        console.log('productos:', productos);
        console.log('idUsuarioSesion:', idUsuarioSesion);
        
        if (!idUsuarioSesion) return res.status(401).json({ error: 'Usuario no autenticado' });
        
        const resultado = await service.confirmarEntrega(idPedido, productos, idUsuarioSesion);
        res.json(resultado);
    } catch (error) {
        console.error('Error detallado:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.actualizarEstado = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { estado } = req.body;
        
        const resultado = await service.actualizarEstadoEntrega(id, estado);
        res.json(resultado);
    } catch (error) {
        console.error('Error al actualizar estado de entrega:', error);
        res.status(400).json({ error: error.message });
    }
};


