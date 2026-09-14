CLIENTES

POST   /clientes
       -> Registrar cliente

GET    /clientes
       -> Buscar/listar clientes

GET    /clientes/:id
       -> Obtener ficha del cliente

PATCH  /clientes/:id
       -> Editar cliente


Implementacion de crear clientes, cuenta con 7 pasos 

1. Crear módulo clientes
2. Crear CreateClienteDto
3. Crear ClientesController
4. Crear ClientesService
5. Implementar prisma.cliente.create()
6. Probar POST /clientes
7. Recién después conectar el formulario de Next.j