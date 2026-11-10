# Nuvé MCP (local)

Servidor MCP para usar la tienda Nuvé desde **Claude Desktop**. Claude puede consultar el catálogo, los pedidos y el inventario, y también cambiar el estado de un pedido o las existencias de un tono.

No se conecta directo a la base de datos: usa la **misma API GraphQL** que la tienda, iniciando sesión con la cuenta que pongas en `mcp/.env`. Por eso aplica los mismos permisos por rol que el sitio. Además, los cambios que hace Claude disparan las subscriptions, así que el BackOffice abierto se actualiza solo.

## Herramientas

| Herramienta | Qué hace | Rol |
|---|---|---|
| `buscar_productos` | Busca por texto, tono (nombre o #hex) y categoría, con existencias por tono | Cualquiera (sin cuenta también) |
| `ver_producto` | Detalle de un producto, sus tonos y fotos | Cualquiera |
| `stock_bajo` | Tonos con pocas piezas o agotados | ADMIN / OPERADOR |
| `resumen_ventas` | Ventas del día, semana o mes y más vendidos | ADMIN |
| `listar_pedidos` | Pedidos por estado | ADMIN / OPERADOR |
| `detalle_pedido` | Un pedido completo y a qué estados puede pasar | ADMIN / OPERADOR (o el dueño) |
| `cambiar_estado_pedido` | PAGADO a ENVIADO, ENVIADO a ENTREGADO, cancelar | ADMIN / OPERADOR |
| `actualizar_existencias` | Fija o suma piezas a un tono por SKU | ADMIN / OPERADOR |
| `mis_pedidos` | Pedidos de la cuenta configurada | Cualquier cuenta |
| `quien_soy` | Con qué cuenta y rol está conectado | Cualquier cuenta |

Recursos: `nuve://catalogo` y las páginas de ayuda (`nuve://ayuda/envios`, `terminos`, `privacidad`, `contacto`).

## Instalación

1. En la carpeta `mcp`: `npm install`
2. Copia `.env.example` a `.env` y pon una cuenta de la tienda (correo y contraseña).
3. Agrega el servidor a Claude Desktop (ver abajo) y reinicia Claude Desktop.
4. El backend debe estar corriendo (`cd back` y `npm run dev`).

## Configuración de Claude Desktop

Archivo: `%APPDATA%\Claude\claude_desktop_config.json` (en Claude Desktop: Configuración > Desarrollador > Editar configuración).

```json
{
  "mcpServers": {
    "nuve": {
      "command": "node",
      "args": ["C:\\Users\\nattm\\Documents\\nuve-ecommerce-integrado\\mcp\\index.js"]
    }
  }
}
```

Si el archivo ya tiene otros servidores, agrega solo el bloque `"nuve": { ... }` dentro de `mcpServers`.

## Probar sin Claude Desktop

`npm run inspector` abre el MCP Inspector en el navegador para llamar cada herramienta a mano.
