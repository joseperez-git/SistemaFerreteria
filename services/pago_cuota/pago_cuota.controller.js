const service = require('./pago_cuota.service');

exports.registrarPago = async (req, res) => {
    try {
        const { id_cuota_venta, metodo_pago, monto } = req.body;
        
        if (!id_cuota_venta || !metodo_pago || !monto) {
            return res.status(400).json({ error: 'Faltan datos requeridos' });
        }
        
        const resultado = await service.registrarPago(id_cuota_venta, metodo_pago, monto);
        res.json(resultado);
        
    } catch (error) {
        console.error('Error al registrar pago:', error);
        res.status(400).json({ error: error.message });
    }
};


