let salesChartInstance = null;
let nodesChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
    loadBigDataStatus();

    // Botones del dashboard
    document.getElementById("btn-refresh").addEventListener("click", loadBigDataStatus);
    document.getElementById("btn-surge").addEventListener("click", triggerSurge);
    document.getElementById("btn-failover").addEventListener("click", triggerFailover);
});

function formatCOP(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value);
}

async function loadProducts() {
    try {
        const response = await fetch('/api/products');
        const products = await response.json();
        
        const grid = document.getElementById("product-grid");
        grid.innerHTML = "";

        products.forEach(p => {
            const card = document.createElement("div");
            card.className = "product-card";
            
            card.innerHTML = `
                <img src="${p.image}" alt="${p.name}">
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p>${formatCOP(p.price)}</p>
                    <button class="btn-buy" onclick="buyProduct('${p.name}', '${p.category}', ${p.price})">Comprar Obra</button>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (error) {
        console.error("Error cargando productos:", error);
    }
}

async function buyProduct(productName, category, price) {
    try {
        document.getElementById("last-routing-log").innerText = "⏳ Escribiendo en CSV primario, replicando y ejecutando Spark...";
        const response = await fetch('/api/art/interact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ item: productName, category: category, price: price })
        });
        const result = await response.json();
        
if (result.status === "success") {
            document.getElementById("last-routing-log").innerText = `✅ ID #${result.inserted_record.id}: ${result.routing_info} (${result.response_time_ms} ms)`;
            updateDashboardUI(result);
            alert(`¡Compra registrada!\nID Único: ${result.inserted_record.id}\n${result.routing_info}`);
        } else {
            document.getElementById("last-routing-log").innerText = `❌ Error del servidor: ${result.message}`;
        }
    } catch (error) {
        console.error("Error en compra:", error);
        document.getElementById("last-routing-log").innerText = `❌ Error de conexión: ${error.message}`;
    }
}

async function loadBigDataStatus() {
    try {
        const response = await fetch('/api/bigdata/status');
        const data = await response.json();
        if (data.status === "ok") {
            updateDashboardUI(data);
        }
    } catch (error) {
        console.error("Error consultando Apache Spark:", error);
    }
}

async function triggerSurge() {
    try {
        document.getElementById("last-routing-log").innerText = "⏳ Inyectando lote de 12 transacciones en P1–P4...";
        const response = await fetch('/api/bigdata/surge', { method: 'POST' });
        const data = await response.json();
        if (data.status === "surge_completed") {
            document.getElementById("last-routing-log").innerText = `⚡ Lote de +12 registros particionado en 4 nodos y analizado por Spark en ${data.response_time_ms} ms`;
            updateDashboardUI(data);
        }
    } catch (error) {
        console.error("Error simulando lote:", error);
    }
}

async function triggerFailover() {
    try {
        const response = await fetch('/api/bigdata/failover', { method: 'POST' });
        const data = await response.json();
        updateDashboardUI(data);
        
        if (data.failover_active) {
            alert("🔥 PRUEBA P05 (FALLA DE NODO):\nSe desactivó nodo_2/primarios.\nApache Spark detectó el fallo y leyó automáticamente la partición P2 desde nodo_3/replicas/nodo_2 sin perder registros.");
        } else {
            alert("✅ PRUEBA P07 (RECUPERACIÓN):\nSe restauró nodo_2/primarios y se sincronizó desde la réplica en nodo_3 sin duplicar IDs.");
        }
    } catch (error) {
        console.error("Error simulando failover:", error);
    }
}

function updateDashboardUI(payload) {
    const spark = payload.spark;
    if (!spark) return;

    // 1. Métricas de las 5 V
    document.getElementById("metric-volume").innerText = spark.total_unique_records.toLocaleString();
    document.getElementById("metric-raw").innerText = `Registros leídos: ${spark.total_raw_records} (0 duplicados)`;
    document.getElementById("metric-velocity").innerText = (payload.response_time_ms || 450) + " ms";
    
    const isFailover = payload.failover_active;
    document.getElementById("metric-veracity").innerText = isFailover ? "100% (Réplica)" : "100% (Óptimo)";
    document.getElementById("veracity-status-text").innerText = isFailover 
        ? "⚠️ Leyendo P2 desde réplica en nodo_3" 
        : "Validación dropDuplicates(['id']) activa";

    // Actualizar botón y badge superior
    const btnFailover = document.getElementById("btn-failover");
    btnFailover.innerText = isFailover ? "🔄 Recuperar Nodo 2 (Prueba P07)" : "🔥 Simular Fallo en Nodo 2 (P05)";

    const badge = document.getElementById("cluster-badge");
    badge.innerHTML = isFailover 
        ? `<span class="pulse" style="background:#f59e0b;"></span> Clúster Degradado (Failover Activo)` 
        : `<span class="pulse"></span> Clúster 4 Nodos Operativo`;

    // 2. Insights de Valor
    document.getElementById("insight-engine").innerText = spark.engine;
    document.getElementById("insight-style").innerText = spark.top_product;
    document.getElementById("insight-sales").innerText = formatCOP(spark.total_sales_cop);
    
    const catSummary = spark.by_category.map(c => `${c.categoria}: ${c.cantidad} uds (${formatCOP(c.total_cop)})`).join(" | ");
    document.getElementById("insight-categories").innerText = catSummary || "Sin datos";

    // Mostrar logs de failover si existen
    const consoleBox = document.getElementById("failover-console");
    if (spark.failover_logs && spark.failover_logs.length > 0) {
        consoleBox.style.display = "block";
        consoleBox.innerHTML = spark.failover_logs.join("<br>");
    } else {
        consoleBox.style.display = "none";
    }

    // 3. Renderizar los 4 nodos lógicos CSV
    const nodesList = document.getElementById("nodes-list");
    nodesList.innerHTML = "";
    spark.nodes.forEach(node => {
        const isFailed = node.status.includes("Caído");
        const nodeDiv = document.createElement("div");
        nodeDiv.className = `node-item ${isFailed ? 'failed' : ''}`;
        nodeDiv.innerHTML = `
            <div class="node-info">
                <strong>${node.id.toUpperCase()} — Partición ${node.partition}</strong>
                <span>Fuente activa: <code>${node.source_used}</code> (Réplica en ${node.replica_in})</span>
            </div>
            <div>
                <span style="color: ${isFailed ? '#f59e0b' : '#34d399'}; font-weight:600; display:block; text-align:right;">${node.status}</span>
            </div>
        `;
        nodesList.appendChild(nodeDiv);
    });

    // 4. Actualizar los 2 gráficos de Chart.js
    renderCharts(spark);
}

function renderCharts(spark) {
    // Gráfico 1: Barras de Ingresos por Obra (COP)
    const ctxSales = document.getElementById('salesChart').getContext('2d');
    const prodLabels = spark.by_product.map(p => p.producto.split('(')[0].trim());
    const prodTotals = spark.by_product.map(p => p.total_cop);

    if (salesChartInstance) salesChartInstance.destroy();
    salesChartInstance = new Chart(ctxSales, {
        type: 'bar',
        data: {
            labels: prodLabels,
            datasets: [{
                label: 'Ingresos Totales (COP)',
                data: prodTotals,
                backgroundColor: ['#38bdf8', '#818cf8', '#34d399', '#f59e0b'],
                borderRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                x: { ticks: { color: '#cbd5e1' }, grid: { display: false } }
            }
        }
    });

    // Gráfico 2: Dona de Distribución de Registros por Partición/Nodo
    const ctxNodes = document.getElementById('nodesChart').getContext('2d');
    const partLabels = spark.by_partition.map(p => `Nodo ${p.particion.replace('P', '')} (${p.particion})`);
    const partCounts = spark.by_partition.map(p => p.registros);

    if (nodesChartInstance) nodesChartInstance.destroy();
    nodesChartInstance = new Chart(ctxNodes, {
        type: 'doughnut',
        data: {
            labels: partLabels,
            datasets: [{
                data: partCounts,
                backgroundColor: ['#0ea5e9', '#6366f1', '#10b981', '#f97316'],
                borderColor: '#0f172a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: '#cbd5e1' } }
            }
        }
    });
}