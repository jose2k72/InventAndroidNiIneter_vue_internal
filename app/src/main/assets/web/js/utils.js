/**
 * utilidades.js - Herramientas transversales para INETER CADIC
 */

/**
 * Genera un UUID v4 para identificadores únicos de registros
 */
window.generateUUID = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Muestra un modal de confirmación visual con diseño Glassmorphism
 * @param {Object} options - icon, title, message, confirmText, cancelText, onConfirm, onCancel
 */
window.showConfirmModal = function (options) {
    const {
        icon = '⚠️',
        title = '¿Está seguro?',
        message = '',
        confirmText = 'Confirmar',
        cancelText = 'Cancelar',
        onConfirm = () => { },
        onCancel = () => { }
    } = options;

    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-modal-overlay';

    // Condicional para botón de cancelar
    const cancelButtonHtml = cancelText ? `<button class="confirm-btn confirm-btn-cancel" id="modal-cancel">${cancelText}</button>` : '';

    // Estructura del modal
    overlay.innerHTML = `
        <div class="confirm-modal">
            <div class="confirm-modal-icon">${icon}</div>
            <div class="confirm-modal-title">${title}</div>
            <div class="confirm-modal-message">${message}</div>
            <div class="confirm-modal-buttons">
                ${cancelButtonHtml}
                <button class="confirm-btn confirm-btn-danger" id="modal-confirm">${confirmText}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => {
        overlay.style.animation = 'fadeIn 0.2s ease reverse';
        setTimeout(() => overlay.remove(), 150);
    };

    if (cancelText) {
        overlay.querySelector('#modal-cancel').addEventListener('click', () => {
            closeModal();
            onCancel();
        });
    }

    overlay.querySelector('#modal-confirm').addEventListener('click', () => {
        closeModal();
        onConfirm();
    });

    // Cerrar al hacer clic fuera
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closeModal();
            onCancel();
        }
    });
};

/**
 * Convierte una fecha a formato ISO (YYYY-MM-DD)
 */
window.formatDateToISO = function (date) {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
};

/**
 * Convierte una fecha ISO a formato local (DD/MM/YYYY)
 */
window.formatISOToLocale = function (isoString) {
    if (!isoString) return '';
    try {
        const [year, month, day] = isoString.split('-');
        if (!year || !month || !day) return isoString;
        return `${day}/${month}/${year}`;
    } catch (e) {
        return isoString;
    }
};

/**
 * Extrae las iniciales de un nombre completo
 * @param {string} name - Nombre completo
 */
window.getInitials = function (name) {
    if (!name) return '';
    return name
        .split(' ')
        .filter(part => part.length > 0)
        .map(part => part[0].toUpperCase())
        .join('');
};
