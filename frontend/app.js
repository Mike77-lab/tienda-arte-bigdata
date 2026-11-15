document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadBigDataStatus();

    // Actualizar estado de Big Data cada 3 segundos automáticamente
    setInterval(loadBigDataStatus, 3000);

    // Botón de simulación de tráfico masivo
    document.getElementById("btn-surge").addEventListener("click", triggerSurge);
});

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const grid = document.getElementById("product-grid");
        grid.innerHTML = "";

        products.forEach(p => {
            const card = document.createElement("div");
            card.className = "product-card";
            
            // Formato de pesos colombianos (COP)
            const formattedPrice = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(p.price);
            
            card.innerHTML = `
                <img src="${p.image}" alt="${p.name}">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p>${formattedPrice}</p>
                    <button class="btn-buy" onclick="buyProduct('${p.name}')">Comprar Obra</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

async function buyProduct(productName) {
    try {
        const response = await fetch('/api/art/interact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'purchase', item: productName })
        });
        const result = await response.json();
        updateDashboardUI(result.data);
        alert(`¡Compra registrada con éxito! Obra: "${productName}". Flujo de datos actualizado en el clúster.`);
    } catch (error) {
        console.error("Error en compra:", error);
    }
}

async function loadBigDataStatus() {
    try {
        const response = await fetch('/api/bigdata/status');
        const data = await response.json();
        updateDashboardUI(data);
    } catch (error) {
        console.error("Error consultando estado de Big Data:", error);
    }
}

async function triggerSurge() {
    try {
        const response = await fetch('/api/bigdata/surge', { method: 'POST' });
        const data = await response.json();
        updateDashboardUI(data);
        alert("⚡ ¡Pico de tráfico masivo inyectado en el sistema! Observa cómo aumentó la velocidad y carga de los nodos.");
    } catch (error) {
        console.error("Error simulando tráfico:", error);
    }
}

function updateDashboardUI(data) {
    const metrics = data.metrics;
    
    document.getElementById("metric-volume").innerText = metrics.volume_records.toLocaleString();
    document.getElementById("metric-velocity").innerText = metrics.velocity_tps + " tps";
    document.getElementById("metric-veracity").innerText = metrics.veracity_score + "%";

    // Insights de Valor
    document.getElementById("insight-style").innerText = metrics.value_insights.top_style;
    document.getElementById("insight-sales").innerText = metrics.value_insights.total_sales_value;
    document.getElementById("insight-action").innerText = metrics.value_insights.recommended_action;

    // Renderizar nodos
    const nodesList = document.getElementById("nodes-list");
    nodesList.innerHTML = "";
    data.nodes.forEach(node => {
        const nodeDiv = document.createElement("div");
        nodeDiv.className = "node-item";
        nodeDiv.innerHTML = `
            <div class="node-info">
                <strong>${node.id} (${node.ip})</strong>
                <span>${node.role}</span>
            </div>
            <div>
                <span style="color: #34d399; font-weight:600;">${node.status}</span>
                <span style="text-align: right; color: #38bdf8;">Carga: ${node.load}</span>
            </div>
        `;
        nodesList.appendChild(nodeDiv);
    });
}