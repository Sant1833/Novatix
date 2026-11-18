from pyspark.sql import SparkSession

spark = SparkSession.builder.appName("VentasTienda").getOrCreate()
sc = spark.sparkContext

# Paso 1: cargar el archivo como RDD
rdd = sc.textFile("file:///home/vagrant/ventas.txt")

# Paso 2: map -> (producto, precio, cantidad)
datos = rdd.map(lambda l: l.split(",")) \
           .map(lambda p: (p[0], float(p[1]), int(p[2])))

# Paso 3: reduceByKey -> total de ventas por producto
ventas_por_producto = datos.map(lambda t: (t[0], t[1] * t[2])) \
                           .reduceByKey(lambda a, b: a + b)
print("\n--- Ventas por producto ---")
for producto, total in ventas_por_producto.collect():
    print(f"{producto}: {total}")

# Paso 4: reduce -> total de la tienda
total_tienda = ventas_por_producto.map(lambda x: x[1]) \
                                  .reduce(lambda a, b: a + b)
print("\n--- Total de la tienda ---")
print(total_tienda)

# Paso 5: sortBy -> producto mas vendido
mas_vendido = ventas_por_producto.sortBy(lambda x: x[1], ascending=False).first()
print("\n--- Producto mas vendido (por dinero) ---")
print(mas_vendido)

spark.stop()
