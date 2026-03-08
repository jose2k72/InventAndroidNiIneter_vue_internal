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
