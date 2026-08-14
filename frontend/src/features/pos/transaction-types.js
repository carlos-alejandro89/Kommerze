export const TRANSACTION_TYPES = Object.freeze({
  VENTA: { id: 1, guid: 'f1b2c3d4-e5f6-4a7b-8c9d-012345678901', name: 'Venta' },
  COTIZACION: { id: 2, guid: 'f1b2c3d4-e5f6-4a7b-8c9d-012345678902', name: 'Cotización' },
  TRASPASO: { id: 3, guid: 'f1b2c3d4-e5f6-4a7b-8c9d-012345678903', name: 'Traspaso' },
  COMPRA: { id: 4, guid: 'c82164a9-616c-4148-80fd-c4702d8a7cca', name: 'Compra' },
  BAJA_MERCANCIA: { id: 5, guid: '7a117386-2369-4fce-b2e7-b1dbd38ecf58', name: 'Baja de mercancía' },
});

export const transactionGuid = transaction => String(transaction?.Guid || transaction?.guid || transaction?.TipoPedidoGuid || '').toLowerCase();

export const isTransactionType = (transaction, type) => {
  const guid = transactionGuid(transaction);
  return guid ? guid === type.guid : Number(transaction?.TipoPedidoID ?? transaction?.ID) === type.id;
};
