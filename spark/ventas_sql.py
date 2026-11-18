from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("VentasSQL").getOrCreate()
sc = spark.sparkContext

rdd = sc.textFile("file:///home/vagrant/ventas.txt")
datos = rdd.map(lambda l: l.split(",")) \
           .map(lambda p: (p[0], float(p[1]), int(p[2])))

df = datos.toDF(["producto", "precio", "cantidad"])
df.createOrReplaceTempView("ventas")

print("\n--- Datos como DataFrame ---")
df.show()

print("--- Total de ventas por producto ---")
spark.sql("""
    SELECT producto, SUM(precio * cantidad) AS total
    FROM ventas
    GROUP BY producto
    ORDER BY total DESC
""").show()

print("--- Total de la tienda ---")
spark.sql("SELECT SUM(precio * cantidad) AS total_tienda FROM ventas").show()

print("--- Producto mas vendido ---")
spark.sql("""
    SELECT producto, SUM(precio * cantidad) AS total
    FROM ventas
    GROUP BY producto
    ORDER BY total DESC
    LIMIT 1
""").show()

spark.stop()
