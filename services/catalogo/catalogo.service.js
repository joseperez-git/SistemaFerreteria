const db = require('../../config/db');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BASE_PATH = path.join(__dirname, '../../public/Fotos/catalogo');
const BASE_URL = '/Fotos/catalogo';

const ensureDir = (dir) => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); };

const guardarArchivo = (archivo, carpeta) => {
    const uniqueId = uuidv4().split('-')[0];
    const timestamp = Date.now();
    const nombreOriginal = path.parse(archivo.originalname).name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const ext = path.extname(archivo.originalname).toLowerCase();
    const nombreArchivo = `${uniqueId}_${timestamp}_${nombreOriginal}${ext}`;
    const dirDestino = path.join(BASE_PATH, carpeta);
    ensureDir(dirDestino);
    fs.writeFileSync(path.join(dirDestino, nombreArchivo), archivo.buffer);
    return { nombre_archivo: nombreArchivo, ruta_relativa: `/${carpeta}/${nombreArchivo}`, url_publica: `${BASE_URL}/${carpeta}/${nombreArchivo}` };
};

// ============================================
// LOGO (con SPs)
// ============================================
exports.listarLogos = async () => {
    const [rows] = await db.query('CALL sp_logo_listar()');
    return rows[0].map(l => ({ ...l, url_completa: `${BASE_URL}${l.ruta}` }));
};

exports.subirLogo = async (archivo) => {
    if (!archivo) throw new Error('Debe seleccionar una imagen');
    const info = guardarArchivo(archivo, 'logo');
    const [result] = await db.query('CALL sp_logo_registrar(?, ?)', [info.nombre_archivo, info.ruta_relativa]);
    return { id: result[0][0]?.id, message: 'Logo subido correctamente', nombre_archivo: info.nombre_archivo, ruta: info.url_publica };
};

exports.publicarLogo = async (id) => { await db.query('CALL sp_logo_publicar(?)', [id]); return { message: 'Logo publicado correctamente' }; };

exports.eliminarLogo = async (id) => {
    const [rows] = await db.query('CALL sp_logo_listar()');
    const logo = rows[0].find(l => l.id === id);
    if (!logo) throw new Error('Logo no encontrado');
    const fp = path.join(BASE_PATH, logo.ruta);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    await db.query('CALL sp_logo_eliminar(?)', [id]);
    return { message: 'Logo eliminado correctamente' };
};

// ============================================
// SLIDER (usando SPs existentes)
// ============================================
exports.listarSliders = async () => {
    const [rows] = await db.query('CALL sp_listar_slider()');
    return rows[0]
        .filter(s => s.estado != 2)
        .map(s => ({
            ...s,
            url_completa: `/Fotos/catalogo/slider/${s.nombre_archivo}`
        }));
};
exports.subirSlider = async (archivo, titulo, subtitulo) => {
    if (!archivo) throw new Error('Debe seleccionar una imagen');
    const info = guardarArchivo(archivo, 'slider');

    // Obtener el último ID y sumarle 1 para el nuevo orden
    const [lastId] = await db.query('SELECT COALESCE(MAX(id), 0) + 1 AS siguiente FROM slider');
    const nuevoOrden = lastId[0].siguiente;

    await db.query('CALL sp_registrar_slider(?, ?, ?, ?, ?, ?)', [
        'FOTO',
        titulo || 'Slider',
        subtitulo || '',
        info.nombre_archivo,
        nuevoOrden,
        1
    ]);

    const [idRows] = await db.query('SELECT MAX(id) AS id FROM slider');
    return {
        id: idRows[0].id,
        message: 'Slider subido correctamente',
        nombre_archivo: info.nombre_archivo,
        ruta: info.url_publica
    };
};

exports.cambiarEstadoSlider = async (id, estado) => {
    if (estado === 2) {
        await db.query('CALL sp_eliminar_slider(?)', [id]);
        return { message: 'Slider eliminado correctamente' };
    }
    await db.query('UPDATE slider SET estado = ? WHERE id = ?', [estado, id]);
    const m = { 0: 'Slider inactivado correctamente', 1: 'Slider activado correctamente' };
    return { message: m[estado] };
};

// ============================================
// REDES SOCIALES (con SPs)
// ============================================
exports.listarRedes = async () => { const [r] = await db.query('CALL sp_red_social_listar()'); return r[0]; };
exports.obtenerRedPorId = async (id) => { const [r] = await db.query('CALL sp_red_social_obtener(?)', [id]); return r[0][0] || null; };

exports.guardarRedSocial = async (body) => {
    const { id, tipo, nombre, url } = body;
    const [result] = await db.query('CALL sp_red_social_guardar(?, ?, ?, ?)', [id || null, tipo, nombre, url]);
    return { id: result[0]?.[0]?.id || id, message: id ? 'Red actualizada correctamente' : 'Red creada correctamente' };
};

exports.cambiarEstadoRed = async (id, estado) => {
    await db.query('CALL sp_red_social_estado(?, ?)', [id, estado]);
    const m = { 0: 'Red inactivada correctamente', 1: 'Red activada correctamente', 2: 'Red eliminada correctamente' };
    return { message: m[estado] };
};