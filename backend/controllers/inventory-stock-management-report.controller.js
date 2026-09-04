import prisma from '../config/database.js';

export const getInventoryStockManagementReport = async (req, res) => {
  try {
    const { 
      dateFrom, dateTo, status, searchTerm = '', 
      organizationId, supplierId,
      page = 1, limit = 50,
      sortBy = 'itemName', sortOrder = 'asc'
    } = req.query;

    console.log('📡 Report Request - Org:', organizationId, 'Supplier:', supplierId);

    const pageNum = parseInt(page) || 1;
    const pageLimit = parseInt(limit) || 50;
    const skip = (pageNum - 1) * pageLimit;

    // Build date filter
    const dateFilter = {};
    if (dateFrom || dateTo) {
      if (dateFrom) { const start = new Date(dateFrom); start.setHours(0, 0, 0, 0); dateFilter.gte = start; }
      if (dateTo) { const end = new Date(dateTo); end.setHours(23, 59, 59, 999); dateFilter.lte = end; }
    }

    let allData = [];
    let summary = {};

    // ===== LAB MODE (DEFAULT) =====
    if (!organizationId && !supplierId) {
      const labStocks = await prisma.labStock.findMany({
        where: {
          ...(searchTerm ? {
            item: {
              OR: [
                { itemName: { contains: searchTerm, mode: 'insensitive' } },
                { itemCode: { contains: searchTerm, mode: 'insensitive' } }
              ]
            }
          } : {}),
          ...(Object.keys(dateFilter).length > 0 ? { lastStockUpdate: dateFilter } : {})
        },
        include: { item: { include: { hsnCode: true } } }
      });

      const getStockStatus = (quantity) => {
        if (quantity === 0) return 'Out of Stock';
        if (quantity <= 50) return 'Critical';
        if (quantity <= 200) return 'Low';
        return 'Normal';
      };

      allData = labStocks.map(stock => ({
        itemId: stock.itemId,
        itemName: stock.item.itemName,
        itemCode: stock.item.itemCode,
        hsnCode: stock.item.hsnCode?.hsnCode || 'N/A',
        unit: stock.item.unit,
        batchNo: stock.batchNo,
        expiryDate: stock.expiryDate,
        quantityAvailable: stock.quantityAvailable,
        status: getStockStatus(stock.quantityAvailable),
        isExpired: new Date() > new Date(stock.expiryDate),
        lastUpdated: stock.lastStockUpdate,
        mode: 'lab'
      }));

      summary = {
        totalItems: new Set(allData.map(d => d.itemId)).size,
        totalQuantity: allData.reduce((sum, item) => sum + item.quantityAvailable, 0),
        criticalCount: allData.filter(item => item.status === 'Critical').length,
        lowCount: allData.filter(item => item.status === 'Low').length,
        expiredCount: allData.filter(item => item.isExpired).length
      };
    }
    // ===== SUPPLIER MODE =====
    else if (supplierId) {
      const stockEntries = await prisma.stockEntry.findMany({
        where: {
          supplierId: parseInt(supplierId),
          status: 'Active',
          ...(Object.keys(dateFilter).length > 0 ? { invoiceDate: dateFilter } : {})
        },
        include: {
          supplier: true,
          items: { include: { item: { include: { hsnCode: true } } } }
        }
      });

      for (const entry of stockEntries) {
        for (const item of entry.items) {
          if (searchTerm && 
              !item.item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !item.item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) {
            continue;
          }

          const isExpired = new Date() > new Date(item.expiryDate);
          let itemStatus = 'Good';
          if (isExpired) itemStatus = 'Expired';
          else if (new Date() > new Date(item.expiryDate) - (7 * 24 * 60 * 60 * 1000)) itemStatus = 'Expiring Soon';

          allData.push({
            itemId: item.itemId,
            itemName: item.item.itemName,
            itemCode: item.item.itemCode,
            hsnCode: item.item.hsnCode?.hsnCode || 'N/A',
            unit: item.item.unit,
            batchNo: item.batchNo,
            expiryDate: item.expiryDate,
            quantityTaken: item.quantity,
            pricePerUnit: item.pricePerUnit,
            totalAmount: item.totalAmount,
            invoiceNo: entry.invoiceNo,
            invoiceDate: entry.invoiceDate,
            supplierName: entry.supplier?.supplierName || 'N/A',
            status: itemStatus,
            mode: 'supplier'
          });
        }
      }

      summary = {
        totalItems: new Set(allData.map(d => d.itemId)).size,
        totalQuantityTaken: allData.reduce((sum, item) => sum + item.quantityTaken, 0),
        totalInvoiceValue: allData.reduce((sum, item) => sum + item.totalAmount, 0),
        invoiceCount: new Set(allData.map(d => d.invoiceNo)).size
      };
    }
    // ===== ORGANIZATION MODE =====
    else if (organizationId) {
      const transfers = await prisma.labToOrgTransfer.findMany({
        where: {
          organizationId: organizationId.toString(),
          ...(Object.keys(dateFilter).length > 0 ? { transferDate: dateFilter } : {})
        },
        include: {
          items: { include: { item: { include: { hsnCode: true } } } },
          organization: true
        }
      });

      const orgStocks = await prisma.organizationStock.findMany({
        where: { organizationId: organizationId.toString() },
        include: { item: true }
      });

      // Get current lab stocks for calculating lab usage
      const labStocks = await prisma.labStock.findMany({
        include: { item: true }
      });
      const labStockMap = new Map();
      for (const stock of labStocks) {
        labStockMap.set(stock.itemId, stock.quantityAvailable);
      }

      const itemMap = new Map();

      for (const transfer of transfers) {
        for (const transferItem of transfer.items) {
          if (searchTerm && 
              !transferItem.item.itemName.toLowerCase().includes(searchTerm.toLowerCase()) &&
              !transferItem.item.itemCode.toLowerCase().includes(searchTerm.toLowerCase())) {
            continue;
          }

          const key = `${transferItem.itemId}_${transferItem.batchNo}`;
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              itemId: transferItem.itemId,
              itemName: transferItem.item.itemName,
              itemCode: transferItem.item.itemCode,
              hsnCode: transferItem.item.hsnCode?.hsnCode || 'N/A',
              unit: transferItem.item.unit,
              batchNo: transferItem.batchNo,
              expiryDate: transferItem.expiryDate,
              quantityTransferred: 0,
              currentOrgStock: 0,
              quantityUsed: 0,
              currentLabStock: 0,
              organizationName: transfer.organization?.name || 'N/A',
              status: 'Good'
            });
          }
          const item = itemMap.get(key);
          item.quantityTransferred += transferItem.quantity;
          item.currentLabStock = labStockMap.get(transferItem.itemId) || 0;
        }
      }

      for (const orgStock of orgStocks) {
        const key = `${orgStock.itemId}_${orgStock.batchNo}`;
        if (itemMap.has(key)) {
          itemMap.get(key).currentOrgStock = orgStock.quantityAvailable;
        }
      }

      for (const item of itemMap.values()) {
        item.quantityUsed = Math.max(0, item.quantityTransferred - item.currentOrgStock);
        if (new Date() > new Date(item.expiryDate)) {
          item.status = 'Expired';
        } else if (new Date() > new Date(item.expiryDate) - (7 * 24 * 60 * 60 * 1000)) {
          item.status = 'Expiring Soon';
        }
      }

      allData = Array.from(itemMap.values());

      summary = {
        totalItems: new Set(allData.map(d => d.itemId)).size,
        totalQuantityTransferred: allData.reduce((sum, item) => sum + item.quantityTransferred, 0),
        totalQuantityUsed: allData.reduce((sum, item) => sum + item.quantityUsed, 0),
        totalQuantityRemaining: allData.reduce((sum, item) => sum + item.currentOrgStock, 0)
      };
    }

    // Apply status filter
    let filteredData = allData;
    if (status) {
      filteredData = filteredData.filter(item => item.status === status);
    }

    // Sort
    const sortField = ['itemName', 'quantityAvailable', 'quantityTaken', 'quantityTransferred', 'expiryDate'].includes(sortBy) ? sortBy : 'itemName';
    const order = sortOrder?.toLowerCase() === 'desc' ? -1 : 1;

    filteredData.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'number') return (aVal - bVal) * order;
      return aVal.toString().localeCompare(bVal.toString()) * order;
    });

    // Paginate
    const totalCount = filteredData.length;
    const paginatedData = filteredData.slice(skip, skip + pageLimit);

    return res.json({
      success: true,
      data: paginatedData,
      summary,
      pagination: { page: pageNum, limit: pageLimit, total: totalCount, pages: Math.ceil(totalCount / pageLimit) }
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate report',
      error: error.message
    });
  }
};

export const getLowStockAlerts = async (req, res) => {
  try {
    const labStocks = await prisma.labStock.findMany({
      where: { quantityAvailable: { lte: 50 } },
      include: { item: true },
      orderBy: { quantityAvailable: 'asc' },
      take: 50
    });

    return res.json({
      success: true,
      data: labStocks,
      count: labStocks.length
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch low stock alerts',
      error: error.message
    });
  }
};

export const getExpiringItems = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const expiryThreshold = new Date();
    expiryThreshold.setDate(expiryThreshold.getDate() + parseInt(days));

    const labExpiring = await prisma.labStock.findMany({
      where: {
        expiryDate: { lte: expiryThreshold, gt: new Date() }
      },
      include: { item: true },
      orderBy: { expiryDate: 'asc' }
    });

    const orgExpiring = await prisma.organizationStock.findMany({
      where: {
        expiryDate: { lte: expiryThreshold, gt: new Date() }
      },
      include: { item: true, organization: true },
      orderBy: { expiryDate: 'asc' }
    });

    const labData = labExpiring.map(stock => ({
      itemName: stock.item.itemName,
      itemCode: stock.item.itemCode,
      batchNo: stock.batchNo,
      expiryDate: stock.expiryDate,
      quantityAvailable: stock.quantityAvailable,
      location: 'Lab',
      daysUntilExpiry: Math.ceil((new Date(stock.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    const orgData = orgExpiring.map(stock => ({
      itemName: stock.item.itemName,
      itemCode: stock.item.itemCode,
      batchNo: stock.batchNo,
      expiryDate: stock.expiryDate,
      quantityAvailable: stock.quantityAvailable,
      location: stock.organization?.name || 'Unknown',
      daysUntilExpiry: Math.ceil((new Date(stock.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    return res.json({
      success: true,
      data: [...labData, ...orgData].sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate)),
      count: labData.length + orgData.length
    });
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring items',
      error: error.message
    });
  }
};
