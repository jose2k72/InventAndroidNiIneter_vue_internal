/**
 * legacy_code.js - Módulo de reserva para funcionalidades del motor anterior
 * (Aceras, Caminos y Selección de Rutas Geográficas)
 * Se mantiene aquí para referencia o futura reutilización.
 */

window.LegacyRouteModule = {
    routeSelectionCallback: null,

    openRouteModal: function (rutas, callback) {
        const modal = document.getElementById('route-selection-modal');
        const listContainer = document.getElementById('route-list');

        if (!modal || !listContainer) return;

        this.routeSelectionCallback = callback;
        listContainer.innerHTML = '';

        rutas.forEach(ruta => {
            const btn = document.createElement('div');
            btn.className = 'route-btn';
            btn.innerHTML = `
                <div>
                    <div class="route-btn-code">${ruta.localizacion}</div>
                    <div class="route-btn-details">${ruta.tipo} • ${ruta.direccion || '?'}</div>
                </div>
                <div class="route-btn-dist">${ruta.distancia}m</div>
            `;
            btn.onclick = () => this.selectRoute(ruta);
            listContainer.appendChild(btn);
        });

        modal.style.display = 'flex';
    },

    closeRouteModal: function () {
        const modal = document.getElementById('route-selection-modal');
        if (modal) modal.style.display = 'none';
        this.routeSelectionCallback = null;
    },

    selectRoute: function (ruta) {
        const cb = this.routeSelectionCallback;
        this.closeRouteModal();
        if (cb) cb(ruta);
    }
};
