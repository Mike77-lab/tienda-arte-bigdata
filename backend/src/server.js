const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Servir el frontend estático
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// Rutas del clúster de 4 nodos lógicos CSV
const clusterBase = path.join(__dirname, '../data/cluster');
const sparkScript = path.join(__dirname, '../python/spark_analyzer.py');
const CSV_HEADER = 'id,fecha,producto,categoria,valor,particion\n';

// Catálogo de obras con precios en COP e imágenes locales
const ART_PRODUCTS = [
    { id: 1, name: "Atardecer Andino (Óleo)", category: "Cuadro", price: 60000, image: "images/Cuadro1.jpg" },
    { id: 2, name: "Guerrero Cyberpunk (Figura 3D)", category: "Figura", price: 80000, image: "images/Cuadro2.jpg" },
    { id: 3, name: "Abstracción Geométrica", category: "Cuadro", price: 60000, image: "images/Cuadro3.jpg" },
    { id: 4, name: "Busto Neoclásico Mármol", category: "Figura", price: 80000, image: "images/Cuadro4.jpg" }
];

// Datos semilla iniciales para demostrar Volumen y Particionado desde el inicio
const INITIAL_RECORDS = [
    { id: 1001, fecha: "2026-11-18T10:15:00Z", producto: "Atardecer Andino (Óleo)", categoria: "Cuadro", valor: 60000 },
    { id: 1002, fecha: "2026-11-18T11:20:00Z", producto: "Guerrero Cyberpunk (Figura 3D)", categoria: "Figura", valor: 80000 },
    { id: 1003, fecha: "2026-11-19T09:05:00Z", producto: "Abstracción Geométrica", categoria: "Cuadro", valor: 60000 },
    { id: 1004, fecha: "2026-11-19T14:30:00Z", producto: "Busto Neoclásico Mármol", categoria: "Figura", valor: 80000 },
    { id: 1005, fecha: "2026-11-20T16:10:00Z", producto: "Atardecer Andino (Óleo)", categoria: "Cuadro", valor: 60000 },
    { id: 1006, fecha: "2026-11-20T17:45:00Z", producto: "Guerrero Cyberpunk (Figura 3D)", categoria: "Figura", valor: 80000 },
    { id: 1007, fecha: "2026-11-21T08:50:00Z", producto: "Abstracción Geométrica", categoria: "Cuadro", valor: 60000 },
    { id: 1008, fecha: "2026-11-21T10:00:00Z", producto: "Busto Neoclásico Mármol", categoria: "Figura", valor: 80000 }
];

function initCluster() {
    for (let i = 1; i <= 4; i++) {
        const nextNode = (i % 4) + 1;
        const primaryDir = path.join(clusterBase, `nodo_${i}`, 'primarios');
        const replicaDir = path.join(clusterBase, `nodo_${nextNode}`, 'replicas', `nodo_${i}`);

        fs.mkdirSync(primaryDir, { recursive: true });
        fs.mkdirSync(replicaDir, { recursive: true });

        const primaryFile = path.join(primaryDir, 'registros.csv');
        const replicaFile = path.join(replicaDir, 'registros.csv');

        if (!fs.existsSync(primaryFile) && !fs.existsSync(path.join(clusterBase, `nodo_${i}`, 'primarios_OFFLINE'))) {
            fs.writeFileSync(primaryFile, CSV_HEADER, 'utf8');
            fs.writeFileSync(replicaFile, CSV_HEADER, 'utf8');
        }
    }

    const p1File = path.join(clusterBase, 'nodo_1', 'primarios', 'registros.csv');
    if (fs.existsSync(p1File)) {
        const lines = fs.readFileSync(p1File, 'utf8').trim().split('\n');
        if (lines.length <= 1) {
            INITIAL_RECORDS.forEach(rec => writeRecordToCluster(rec));
            console.log("📦 Clúster inicializado con 8 registros distribuidos en 4 nodos.");
        }
    }
}

function writeRecordToCluster(record) {
    const nodeNum = ((record.id - 1) % 4) + 1;
    const nextNode = (nodeNum % 4) + 1;
    const partitionName = `P${nodeNum}`;

    const row = `${record.id},${record.fecha},"${record.producto}",${record.categoria},${record.valor},${partitionName}\n`;

    const primaryFile = path.join(clusterBase, `nodo_${nodeNum}`, 'primarios', 'registros.csv');
    const replicaFile = path.join(clusterBase, `nodo_${nextNode}`, 'replicas', `nodo_${nodeNum}`, 'registros.csv');

    if (fs.existsSync(primaryFile)) {
        fs.appendFileSync(primaryFile, row, 'utf8');
    }
    if (fs.existsSync(replicaFile)) {
        fs.appendFileSync(replicaFile, row, 'utf8');
    }

    return { nodeNum, nextNode, partitionName };
}

function getNextUniqueId() {
    let maxId = 1000;
    for (let i = 1; i <= 4; i++) {
        const nextNode = (i % 4) + 1;
        const primaryFile = path.join(clusterBase, `nodo_${i}`, 'primarios', 'registros.csv');
        const replicaFile = path.join(clusterBase, `nodo_${nextNode}`, 'replicas', `nodo_${i}`, 'registros.csv');
        const target = fs.existsSync(primaryFile) ? primaryFile : replicaFile;

        if (fs.existsSync(target)) {
            const lines = fs.readFileSync(target, 'utf8').trim().split('\n').slice(1);
            lines.forEach(line => {
                const idVal = parseInt(line.split(',')[0], 10);
                if (!isNaN(idVal) && idVal > maxId) maxId = idVal;
            });
        }
    }
    return maxId + 1;
}

function executePySpark() {
    return new Promise((resolve, reject) => {
        const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
        const envVars = {
            ...process.env,
            _JAVA_OPTIONS: '-Xmx192m -Xms64m',
            PYSPARK_PYTHON: pythonCmd
        };

        execFile(pythonCmd, [sparkScript], { env: envVars, maxBuffer: 1024 * 1024 * 5 }, (error, stdout, stderr) => {
            if (error) {
                console.error("Error ejecutando PySpark:", stderr || error.message);
                return reject(new Error(stderr || error.message));
            }
            try {
                const lines = stdout.trim().split('\n');
                const jsonLine = lines.reverse().find(line => line.trim().startsWith('{'));
                if (!jsonLine) {
                    throw new Error("No se encontró JSON en la salida: " + stdout);
                }
                resolve(JSON.parse(jsonLine));
            } catch (parseErr) {
                reject(new Error("Salida inválida de PySpark: " + stdout));
            }
        });
    });
}

initCluster();

app.get('/api/products', (req, res) => {
    res.json(ART_PRODUCTS);
});

app.get('/api/bigdata/status', async (req, res) => {
    const startTime = Date.now();
    try {
        const sparkData = await executePySpark();
        const elapsedMs = Date.now() - startTime;
        const isFailover = sparkData.nodes.some(n => n.status.includes("Caído"));

        res.json({
            status: "ok",
            response_time_ms: elapsedMs,
            failover_active: isFailover,
            spark: sparkData
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post('/api/art/interact', async (req, res) => {
    const startTime = Date.now();
    try {
        const { item, category, price } = req.body;
        const newId = getNextUniqueId();
        const record = {
            id: newId,
            fecha: new Date().toISOString(),
            producto: item || "Obra General",
            categoria: category || "Cuadro",
            valor: price || 60000
        };

        const routing = writeRecordToCluster(record);
        const sparkData = await executePySpark();
        const elapsedMs = Date.now() - startTime;

        res.json({
            status: "success",
            inserted_record: record,
            routing_info: `Guardado en nodo_${routing.nodeNum} (${routing.partitionName}) y replicado en nodo_${routing.nextNode}`,
            response_time_ms: elapsedMs,
            spark: sparkData
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post('/api/bigdata/surge', async (req, res) => {
    const startTime = Date.now();
    try {
        for (let k = 0; k < 12; k++) {
            const prod = ART_PRODUCTS[k % ART_PRODUCTS.length];
            const newId = getNextUniqueId();
            writeRecordToCluster({
                id: newId,
                fecha: new Date().toISOString(),
                producto: prod.name,
                categoria: prod.category,
                valor: prod.price
            });
        }
        const sparkData = await executePySpark();
        const elapsedMs = Date.now() - startTime;

        res.json({
            status: "surge_completed",
            inserted_batch: 12,
            response_time_ms: elapsedMs,
            spark: sparkData
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.post('/api/bigdata/failover', async (req, res) => {
    try {
        const activeDir = path.join(clusterBase, 'nodo_2', 'primarios');
        const offlineDir = path.join(clusterBase, 'nodo_2', 'primarios_OFFLINE');
        const replicaFile = path.join(clusterBase, 'nodo_3', 'replicas', 'nodo_2', 'registros.csv');

        if (fs.existsSync(activeDir)) {
            fs.renameSync(activeDir, offlineDir);
        } else if (fs.existsSync(offlineDir)) {
            fs.renameSync(offlineDir, activeDir);
            if (fs.existsSync(replicaFile)) {
                fs.copyFileSync(replicaFile, path.join(activeDir, 'registros.csv'));
            }
        }

        const sparkData = await executePySpark();
        const isFailover = sparkData.nodes.some(n => n.status.includes("Caído"));

        res.json({
            status: "toggled",
            failover_active: isFailover,
            spark: sparkData
        });
    } catch (err) {
        res.status(500).json({ status: "error", message: err.message });
    }
});

app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ArtData Store (Node.js + PySpark + CSV Cluster) corriendo en puerto ${PORT}`);
});