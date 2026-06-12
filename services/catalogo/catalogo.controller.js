const service = require('./catalogo.service');

// ============================================
// LOGO
// ============================================
exports.listarLogos = async (req, res) => {
    try {
        const data = await service.listarLogos();
        res.json(data);
    } catch (error) {
        console.error('Error al listar logos:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.subirLogo = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Debe seleccionar una imagen' });
        }
        const resultado = await service.subirLogo(req.file);
        res.json(resultado);
    } catch (error) {
        console.error('Error al subir logo:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.publicarLogo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.publicarLogo(id);
        res.json(resultado);
    } catch (error) {
        console.error('Error al publicar logo:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.eliminarLogo = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.eliminarLogo(id);
        res.json(resultado);
    } catch (error) {
        console.error('Error al eliminar logo:', error);
        res.status(400).json({ error: error.message });
    }
};

// ============================================
// SLIDER
// ============================================
exports.listarSliders = async (req, res) => {
    try {
        const data = await service.listarSliders();
        res.json(data);
    } catch (error) {
        console.error('Error al listar sliders:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.subirSlider = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Debe seleccionar una imagen' });
        }
        const { titulo, subtitulo } = req.body;
        const resultado = await service.subirSlider(req.file, titulo, subtitulo);
        res.json(resultado);
    } catch (error) {
        console.error('Error al subir slider:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.publicarSlider = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.cambiarEstadoSlider(id, 1);
        res.json(resultado);
    } catch (error) {
        console.error('Error al publicar slider:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.inactivarSlider = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.cambiarEstadoSlider(id, 0);
        res.json(resultado);
    } catch (error) {
        console.error('Error al inactivar slider:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.eliminarSlider = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.cambiarEstadoSlider(id, 2);
        res.json(resultado);
    } catch (error) {
        console.error('Error al eliminar slider:', error);
        res.status(400).json({ error: error.message });
    }
};

// ============================================
// REDES SOCIALES
// ============================================
exports.listarRedes = async (req, res) => {
    try {
        const data = await service.listarRedes();
        res.json(data);
    } catch (error) {
        console.error('Error al listar redes:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.obtenerRed = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const data = await service.obtenerRedPorId(id);
        if (!data) return res.status(404).json({ error: 'Red social no encontrada' });
        res.json(data);
    } catch (error) {
        console.error('Error al obtener red:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.guardarRed = async (req, res) => {
    try {
        const resultado = await service.guardarRedSocial(req.body);
        res.json(resultado);
    } catch (error) {
        console.error('Error al guardar red:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.inactivarRed = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.cambiarEstadoRed(id, 0);
        res.json(resultado);
    } catch (error) {
        console.error('Error al inactivar red:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.activarRed = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.cambiarEstadoRed(id, 1);
        res.json(resultado);
    } catch (error) {
        console.error('Error al activar red:', error);
        res.status(400).json({ error: error.message });
    }
};

exports.eliminarRed = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
        const resultado = await service.cambiarEstadoRed(id, 2);
        res.json(resultado);
    } catch (error) {
        console.error('Error al eliminar red:', error);
        res.status(400).json({ error: error.message });
    }
};