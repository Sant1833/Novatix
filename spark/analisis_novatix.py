from pyspark.sql import SparkSession
from pyspark.sql.functions import col, count, sum, avg, round, when, desc

spark = SparkSession.builder \
    .appName("Novatix-Analisis-Deportivo-Distribuido") \
    .getOrCreate()

jdbc_url = "jdbc:mysql://192.168.100.5:3306/reportes_db"
jdbc_props = {
    "user": "novatix_user",
    "password": "Novatix2026*",
    "driver": "com.mysql.cj.jdbc.Driver"
}

partidos = spark.read.csv("/vagrant/datos/partidos.csv", header=True, inferSchema=True)
equipos = spark.read.csv("/vagrant/datos/equipos.csv", header=True, inferSchema=True)
apuestas = spark.read.csv("/vagrant/datos/apuestas.csv", header=True, inferSchema=True)

partidos_liga = partidos.join(
    equipos.select(col("id").alias("eq_id"), "liga", "pais"),
    partidos["id_equipo_local"] == col("eq_id"),
    "inner"
).filter(col("estado") == "finalizado")

rep_ligas = partidos_liga.groupBy("pais", "liga").agg(
    count("id").alias("total_partidos"),
    round(avg(col("goles_local") + col("goles_visitante")), 2).alias("promedio_goles"),
    round(avg("cuota_local"), 2).alias("cuota_local_prom"),
    round(avg("cuota_visitante"), 2).alias("cuota_visitante_prom"),
    round(avg(1.0 / col("cuota_local")) * 100, 2).alias("prob_implicita_local_pct")
).orderBy(desc("total_partidos"))

rep_equipos_apuestas = apuestas.join(
    equipos, apuestas["equipo_id"] == equipos["id"], "inner"
).groupBy("nombre", "pais", "liga").agg(
    count(apuestas["id"]).alias("cantidad_apuestas"),
    round(sum("dinero_apostado"), 2).alias("volumen_apostado"),
    round(sum(when(col("resultado") == "ganada", col("dinero_apostado") * col("cuota")).otherwise(0)), 2).alias("total_pagado"),
    round(avg("cuota"), 2).alias("cuota_promedio")
).withColumn(
    "balance_casa", round(col("volumen_apostado") - col("total_pagado"), 2)
).orderBy(desc("volumen_apostado")).limit(20)

rep_tendencia_resultados = partidos_liga.withColumn(
    "desenlace",
    when(col("goles_local") > col("goles_visitante"), "Local")
    .when(col("goles_local") < col("goles_visitante"), "Visitante")
    .otherwise("Empate")
).groupBy("desenlace").agg(
    count("id").alias("cantidad_partidos"),
    round(avg("cuota_local"), 2).alias("cuota_local_media"),
    round(avg("cuota_empate"), 2).alias("cuota_empate_media"),
    round(avg("cuota_visitante"), 2).alias("cuota_visitante_media")
)

rep_ligas.write.jdbc(url=jdbc_url, table="reporte_ligas", mode="overwrite", properties=jdbc_props)
rep_equipos_apuestas.write.jdbc(url=jdbc_url, table="reporte_top_equipos", mode="overwrite", properties=jdbc_props)
rep_tendencia_resultados.write.jdbc(url=jdbc_url, table="reporte_tendencias", mode="overwrite", properties=jdbc_props)

print("Reportes generados y exportados exitosamente a reportes_db")
spark.stop()
