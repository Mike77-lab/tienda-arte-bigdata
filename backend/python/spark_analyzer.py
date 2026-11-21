import sys
import json
from pathlib import Path
from pyspark.sql import SparkSession
from pyspark.sql.functions import count, sum as spark_sum, col

def run_spark_analysis():
    base_dir = Path(__file__).resolve().parents[1] / "data" / "cluster"

    # Iniciar sesión de Apache Spark aislada en localhost (127.0.0.1) y optimizada para 512MB RAM
    spark = (
        SparkSession.builder
        .appName("ArtDataStore_BigData_Exam")
        .master("local[1]")
        .config("spark.driver.bindAddress", "127.0.0.1")
        .config("spark.driver.host", "127.0.0.1")
        .config("spark.driver.memory", "460m")
        .config("spark.executor.memory", "460m")
        .config("spark.sql.shuffle.partitions", "2")
        .config("spark.ui.enabled", "false")
        .config("spark.ui.showConsoleProgress", "false")
        .getOrCreate()
    )
    spark.sparkContext.setLogLevel("ERROR")

    active_files = []
    node_status = []
    failover_logs = []

    # Política de replicación circular:
    # Partición P1 está en nodo_1/primarios y su réplica en nodo_2/replicas/nodo_1
    # Partición P2 está en nodo_2/primarios y su réplica en nodo_3/replicas/nodo_2
    # Partición P3 está en nodo_3/primarios y su réplica en nodo_4/replicas/nodo_3
    # Partición P4 está en nodo_4/primarios y su réplica en nodo_1/replicas/nodo_4
    for i in range(1, 5):
        next_node = (i % 4) + 1
        primario = base_dir / f"nodo_{i}" / "primarios" / "registros.csv"
        respaldo = base_dir / f"nodo_{next_node}" / "replicas" / f"nodo_{i}" / "registros.csv"

        if primario.exists():
            active_files.append(str(primario))
            node_status.append({
                "id": f"nodo_{i}",
                "partition": f"P{i}",
                "replica_in": f"nodo_{next_node}",
                "status": "Activo (Primario)",
                "source_used": str(primario.relative_to(base_dir))
            })
        elif respaldo.exists():
            active_files.append(str(respaldo))
            msg = f"FAILOVER: nodo_{i} primario no disponible. Leyendo P{i} desde réplica en nodo_{next_node}."
            failover_logs.append(msg)
            node_status.append({
                "id": f"nodo_{i}",
                "partition": f"P{i}",
                "replica_in": f"nodo_{next_node}",
                "status": "Caído (Leyendo Réplica)",
                "source_used": str(respaldo.relative_to(base_dir))
            })
        else:
            spark.stop()
            print(json.dumps({"error": f"Fallo crítico: Partición P{i} sin primario ni réplica."}))
            sys.exit(1)

    # Cargar CSVs en DataFrame distribuido de Spark
    df = spark.read.option("header", True).option("inferSchema", True).csv(active_files)
    
    # Garantizar Veracidad: eliminar posibles duplicados por ID único y filtrar registros válidos
    total_raw = df.count()
    df_clean = df.dropDuplicates(["id"]).filter(col("valor") > 0)
    total_unique = df_clean.count()

    # Agregación 1: Ventas y cantidad por categoría (Cuadro vs Figura)
    cat_agg = (
        df_clean.groupBy("categoria")
        .agg(
            count("*").alias("cantidad"),
            spark_sum("valor").alias("total_cop")
        )
        .collect()
    )
    by_category = [
        {"categoria": row["categoria"], "cantidad": row["cantidad"], "total_cop": int(row["total_cop"] or 0)}
        for row in cat_agg
    ]

    # Agregación 2: Ventas por obra específica
    item_agg = (
        df_clean.groupBy("producto")
        .agg(
            count("*").alias("cantidad"),
            spark_sum("valor").alias("total_cop")
        )
        .orderBy(col("cantidad").desc())
        .collect()
    )
    by_product = [
        {"producto": row["producto"], "cantidad": row["cantidad"], "total_cop": int(row["total_cop"] or 0)}
        for row in item_agg
    ]

    # Agregación 3: Distribución de registros por nodo/partición
    part_agg = (
        df_clean.groupBy("particion")
        .agg(count("*").alias("registros"))
        .orderBy("particion")
        .collect()
    )
    by_partition = [
        {"particion": row["particion"], "registros": row["registros"]}
        for row in part_agg
    ]

    total_sales_cop = sum(item["total_cop"] for item in by_category)
    top_product = by_product[0]["producto"] if by_product else "Sin ventas"

    spark.stop()

    result = {
        "engine": "Apache Spark (PySpark)",
        "total_raw_records": total_raw,
        "total_unique_records": total_unique,
        "total_sales_cop": total_sales_cop,
        "top_product": top_product,
        "by_category": by_category,
        "by_product": by_product,
        "by_partition": by_partition,
        "nodes": node_status,
        "failover_logs": failover_logs
    }

    print(json.dumps(result, ensure_ascii=False))

if __name__ == "__main__":
    run_spark_analysis()